import { Game } from "../../entities/Game";
import { Player } from "../../entities/Player";
import { Phase, Team } from "../../config/constants";
import {
  Werewolf,
  Seer,
  SeerActionType,
  createSeerAction,
  Minion,
  createMinionAction,
  Drunk,
  createDrunkAction,
  Robber,
  createRobberAction,
  Troublemaker,
  createTroublemakerAction,
  Mason,
  Joker,
  createJokerAction,
  Insomniac,
  createInsomniacAction,
  Clone,
  createCloneAction,
  createWerewolfAction,
} from "../../entities/roles";

// Mock logger for testing
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

describe("Role Tests", () => {
  let game: Game;

  beforeEach(() => {
    game = new Game(mockLogger as any);
    game.phase = Phase.Night;
    // Don't pre-populate players - tests will add them as needed
    game.players = [];
  });

  describe("Werewolf", () => {
    it("should see other werewolves when not alone", () => {
      const player1 = new Player("Player1");
      const player2 = new Player("Player2");
      const player3 = new Player("Player3");
      const werewolf1 = new Werewolf();
      const werewolf2 = new Werewolf();
      const seer = new Seer();

      game.players = [player1, player2, player3];
      player1.AddRole(werewolf1);
      player2.AddRole(werewolf2);
      player3.AddRole(seer);

      game.groundRoles = [new Minion(), new Mason(), new Drunk()];

      const action = createWerewolfAction();
      const result = werewolf1.performAction()(game, player1, action);

      expect(result.isAlone).toBe(false);
      expect(result.werewolves).toHaveLength(1);
      expect(result.werewolves[0].name).toBe("Player2");
    });

    it("should see a ground card when alone", () => {
      const player1 = new Player("Player1");
      const player2 = new Player("Player2");
      const player3 = new Player("Player3");
      const werewolf = new Werewolf();
      const minion = new Minion();
      const mason = new Mason();

      game.players = [player1, player2, player3];
      player1.AddRole(werewolf);
      player2.AddRole(minion);
      player3.AddRole(mason);

      game.groundRoles = [new Drunk(), new Seer(), new Robber()];

      const action = createWerewolfAction();
      const result = werewolf.performAction()(game, player1, action);

      expect(result.isAlone).toBe(true);
      expect(result.groundCard).toBe("Drunk");
    });

    it("should throw on invalid action", () => {
      const player1 = new Player("Player1");
      const werewolf = new Werewolf();

      game.players = [player1];
      player1.AddRole(werewolf);

      const invalidAction = { type: "invalid" };
      expect(() => {
        werewolf.performAction()(game, player1, invalidAction);
      }).toThrow("Invalid action for Werewolf");
    });
  });

  describe("Seer", () => {
    it("should see a player's role", () => {
      const player1 = new Player("Player1");
      const player2 = new Player("Player2");
      const seer = new Seer();
      const targetRole = new Werewolf();

      game.players = [player1, player2];
      player1.AddRole(seer);
      player2.AddRole(targetRole);
      game.groundRoles = [new Minion(), new Mason()];

      const action = createSeerAction.seePlayer(player2);
      const result = seer.performAction()(game, player1, action);

      expect(result.playerName).toBe("Player2");
      expect(result.role).toBe("Werewolf");
      expect(result.message).toContain("Player2");
    });

    it("should see two ground cards", () => {
      const player1 = new Player("Player1");
      const seer = new Seer();
      const groundRole1 = new Minion();
      const groundRole2 = new Mason();

      game.players = [player1];
      player1.AddRole(seer);
      game.groundRoles = [groundRole1, groundRole2, new Drunk()];

      const action = createSeerAction.seeGround(groundRole1, groundRole2);
      const result = seer.performAction()(game, player1, action);

      expect(result.groundRole1).toBe("Minion");
      expect(result.groundRole2).toBe("Mason");
    });

    it("should throw on invalid action type", () => {
      const player1 = new Player("Player1");
      const seer = new Seer();

      game.players = [player1];
      player1.AddRole(seer);

      const invalidAction = { type: "invalid" };
      expect(() => {
        seer.performAction()(game, player1, invalidAction);
      }).toThrow("Invalid action for Seer");
    });
  });

  describe("Minion", () => {
    it("should see all werewolves in play", () => {
      const player1 = new Player("Player1");
      const player2 = new Player("Player2");
      const player3 = new Player("Player3");
      const player4 = new Player("Player4");
      const minion = new Minion();
      const werewolf1 = new Werewolf();
      const werewolf2 = new Werewolf();
      const seer = new Seer();

      game.players = [player1, player2, player3, player4];
      player1.AddRole(minion);
      player2.AddRole(werewolf1);
      player3.AddRole(werewolf2);
      player4.AddRole(seer);
      game.groundRoles = [new Mason(), new Drunk()];

      const action = createMinionAction();
      const result = minion.performAction()(game, player1, action);

      expect(result.werewolves).toHaveLength(2);
      expect(result.message).toContain("Player2");
      expect(result.message).toContain("Player3");
    });

    it("should handle no werewolves in play", () => {
      const player1 = new Player("Player1");
      const player2 = new Player("Player2");
      const player3 = new Player("Player3");
      const player4 = new Player("Player4");
      const minion = new Minion();
      const seer = new Seer();
      const mason = new Mason();
      const drunk = new Drunk();

      game.players = [player1, player2, player3, player4];
      player1.AddRole(minion);
      player2.AddRole(seer);
      player3.AddRole(mason);
      player4.AddRole(drunk);
      game.groundRoles = [new Werewolf(), new Robber()];

      const action = createMinionAction();
      const result = minion.performAction()(game, player1, action);

      expect(result.werewolves).toHaveLength(0);
      expect(result.message).toContain("no Werewolves");
    });

    it("should throw on invalid action", () => {
      const player1 = new Player("Player1");
      const minion = new Minion();

      game.players = [player1];
      player1.AddRole(minion);

      const invalidAction = { type: "invalid" };
      expect(() => {
        minion.performAction()(game, player1, invalidAction);
      }).toThrow("Invalid action for Minion");
    });
  });

  describe("Drunk", () => {
    it("should swap role with ground card", () => {
      const player1 = new Player("Player1");
      const drunk = new Drunk();
      const groundRole = new Werewolf();
      const otherGround = new Mason();

      game.players = [player1];
      player1.AddRole(drunk);
      game.groundRoles = [groundRole, otherGround, new Minion()];

      const action = createDrunkAction(groundRole.id);
      const result = drunk.performAction()(game, player1, action);

      expect(result.success).toBe(true);
      expect(player1.getRole().name).toBe("Werewolf");
      expect(game.groundRoles[0].name).toBe("Drunk");
    });

    it("should throw on invalid ground role id", () => {
      const player1 = new Player("Player1");
      const drunk = new Drunk();

      game.players = [player1];
      player1.AddRole(drunk);
      game.groundRoles = [new Werewolf(), new Mason()];

      const action = createDrunkAction("invalid-id");
      expect(() => {
        drunk.performAction()(game, player1, action);
      }).toThrow("Ground role not found");
    });

    it("should throw on invalid action", () => {
      const player1 = new Player("Player1");
      const drunk = new Drunk();

      game.players = [player1];
      player1.AddRole(drunk);

      const invalidAction = { type: "invalid" };
      expect(() => {
        drunk.performAction()(game, player1, invalidAction);
      }).toThrow("Invalid action for Drunk");
    });
  });

  describe("Robber", () => {
    it("should swap role with target player", () => {
      const player1 = new Player("Player1");
      const player2 = new Player("Player2");
      const robber = new Robber();
      const targetRole = new Werewolf();

      game.players = [player1, player2];
      player1.AddRole(robber);
      player2.AddRole(targetRole);
      game.groundRoles = [new Mason(), new Drunk()];

      const action = createRobberAction(player2);
      const result = robber.performAction()(game, player1, action);

      expect(result.newRole).toBe("Werewolf");
      expect(player1.getRole().name).toBe("Werewolf");
      expect(player2.getRole().name).toBe("Robber");
    });

    it("should throw on invalid action", () => {
      const player1 = new Player("Player1");
      const robber = new Robber();

      game.players = [player1];
      player1.AddRole(robber);

      const invalidAction = { type: "invalid" };
      expect(() => {
        robber.performAction()(game, player1, invalidAction);
      }).toThrow("Invalid action for Robber");
    });
  });

  describe("Troublemaker", () => {
    it("should swap roles of two target players", () => {
      const player1 = new Player("Player1");
      const player2 = new Player("Player2");
      const player3 = new Player("Player3");
      const troublemaker = new Troublemaker();
      const role1 = new Werewolf();
      const role2 = new Seer();

      game.players = [player1, player2, player3];
      player1.AddRole(troublemaker);
      player2.AddRole(role1);
      player3.AddRole(role2);
      game.groundRoles = [new Mason(), new Drunk()];

      const action = createTroublemakerAction(player2, player3);
      const result = troublemaker.performAction()(game, player1, action);

      expect(result.player1Name).toBe("Player2");
      expect(result.player2Name).toBe("Player3");
      expect(player2.getRole().name).toBe("Seer");
      expect(player3.getRole().name).toBe("Werewolf");
    });

    it("should throw on invalid action", () => {
      const player1 = new Player("Player1");
      const troublemaker = new Troublemaker();

      game.players = [player1];
      player1.AddRole(troublemaker);

      const invalidAction = { type: "invalid" };
      expect(() => {
        troublemaker.performAction()(game, player1, invalidAction);
      }).toThrow("Invalid action for Troublemaker");
    });
  });

  describe("Mason", () => {
    it("should see other masons", () => {
      const player1 = new Player("Player1");
      const player2 = new Player("Player2");
      const player3 = new Player("Player3");
      const mason1 = new Mason();
      const mason2 = new Mason();
      const werewolf = new Werewolf();

      game.players = [player1, player2, player3];
      player1.AddRole(mason1);
      player2.AddRole(mason2);
      player3.AddRole(werewolf);
      game.groundRoles = [new Drunk(), new Minion()];

      const action = { type: "mason" };
      const result = mason1.performAction()(game, player1, action);

      expect(result.masons).toHaveLength(1);
      expect(result.masons[0].name).toBe("Player2");
    });

    it("should handle being the only mason", () => {
      const player1 = new Player("Player1");
      const player2 = new Player("Player2");
      const player3 = new Player("Player3");
      const mason = new Mason();
      const werewolf = new Werewolf();
      const seer = new Seer();

      game.players = [player1, player2, player3];
      player1.AddRole(mason);
      player2.AddRole(werewolf);
      player3.AddRole(seer);
      game.groundRoles = [new Drunk(), new Minion()];

      const action = { type: "mason" };
      const result = mason.performAction()(game, player1, action);

      expect(result.masons).toHaveLength(0);
      expect(result.message).toContain("only Mason");
    });

    it("should throw on invalid action", () => {
      const player1 = new Player("Player1");
      const mason = new Mason();

      game.players = [player1];
      player1.AddRole(mason);

      const invalidAction = { type: "invalid" };
      expect(() => {
        mason.performAction()(game, player1, invalidAction);
      }).toThrow("Invalid action for Mason");
    });
  });

  describe("Joker", () => {
    it("should look at a ground card", () => {
      const player1 = new Player("Player1");
      const joker = new Joker();
      const groundRole = new Werewolf();

      game.players = [player1];
      player1.AddRole(joker);
      game.groundRoles = [groundRole, new Mason(), new Drunk()];

      const action = createJokerAction(groundRole.id);
      const result = joker.performAction()(game, player1, action);

      expect(result.groundRole).toBe("Werewolf");
      expect(result.message).toContain("Werewolf");
    });

    it("should throw on invalid ground role id", () => {
      const player1 = new Player("Player1");
      const joker = new Joker();

      game.players = [player1];
      player1.AddRole(joker);
      game.groundRoles = [new Werewolf(), new Mason()];

      const action = createJokerAction("invalid-id");
      expect(() => {
        joker.performAction()(game, player1, action);
      }).toThrow("Ground role not found");
    });

    it("should throw on invalid action", () => {
      const player1 = new Player("Player1");
      const joker = new Joker();

      game.players = [player1];
      player1.AddRole(joker);

      const invalidAction = { type: "invalid" };
      expect(() => {
        joker.performAction()(game, player1, invalidAction);
      }).toThrow("Invalid action for Joker");
    });
  });

  describe("Insomniac", () => {
    it("should return current role", () => {
      const player1 = new Player("Player1");
      const insomniac = new Insomniac();

      game.players = [player1];
      player1.AddRole(insomniac);
      game.groundRoles = [new Mason(), new Drunk()];

      const action = createInsomniacAction();
      const result = insomniac.performAction()(game, player1, action);

      expect(result.currentRole).toBe("Insomniac");
      expect(result.originalRole).toBe("Insomniac");
      expect(result.hasChanged).toBe(false);
    });

    it("should detect role change", () => {
      const player1 = new Player("Player1");
      const insomniac = new Insomniac();
      const werewolf = new Werewolf();

      game.players = [player1];
      player1.AddRole(insomniac);
      game.groundRoles = [werewolf, new Mason()];

      // Simulate a role swap
      player1.setRole(werewolf);

      const action = createInsomniacAction();
      const result = insomniac.performAction()(game, player1, action);

      expect(result.currentRole).toBe("Werewolf");
      expect(result.originalRole).toBe("Insomniac");
      expect(result.hasChanged).toBe(true);
    });

    it("should throw on invalid action", () => {
      const player1 = new Player("Player1");
      const insomniac = new Insomniac();

      game.players = [player1];
      player1.AddRole(insomniac);

      const invalidAction = { type: "invalid" };
      expect(() => {
        insomniac.performAction()(game, player1, invalidAction);
      }).toThrow("Invalid action for Insomniac");
    });
  });

  describe("Clone", () => {
    // Helper function to setup clone test
    const setupCloneTest = (targetRole: any, otherRoles: any[] = []) => {
      const clonePlayer = new Player("Cloner");
      const targetPlayer = new Player("Target");
      const clone = new Clone();

      const players = [clonePlayer, targetPlayer, ...otherRoles.map((_, i) => new Player(`Player${i + 3}`))];
      game.players = players;
      clonePlayer.AddRole(clone);
      targetPlayer.AddRole(targetRole);

      otherRoles.forEach((role, i) => {
        players[i + 2].AddRole(role);
      });

      game.groundRoles = [new Mason(), new Drunk(), new Minion()];
      game.getPlayerById = (id: string) => game.players.find((p) => p.id === id);

      return { clonePlayer, targetPlayer, clone };
    };

    describe("Passive Roles", () => {
      it("should clone Werewolf", () => {
        const { clonePlayer, targetPlayer, clone } = setupCloneTest(new Werewolf());

        const action = createCloneAction(targetPlayer);
        const result = clone.performAction()(game, clonePlayer, action);

        expect(result.clonedRole).toBe("Werewolf");
        expect(result.needsSecondAction).toBe(false);
        expect(clonePlayer.getRole().name).toBe("Werewolf");
        expect(result.message).toContain("Werewolf");
      });

      it("should clone Minion", () => {
        const { clonePlayer, targetPlayer, clone } = setupCloneTest(new Minion());

        const action = createCloneAction(targetPlayer);
        const result = clone.performAction()(game, clonePlayer, action);

        expect(result.clonedRole).toBe("Minion");
        expect(result.needsSecondAction).toBe(false);
        expect(clonePlayer.getRole().name).toBe("Minion");
        expect(result.message).toContain("Minion");
      });

      it("should clone Mason and see other masons", () => {
        const mason1 = new Mason();
        const { clonePlayer, targetPlayer, clone } = setupCloneTest(mason1);

        const action = createCloneAction(targetPlayer);
        const result = clone.performAction()(game, clonePlayer, action);

        expect(result.clonedRole).toBe("Mason");
        expect(result.needsSecondAction).toBe(false);
        expect(clonePlayer.getRole().name).toBe("Mason");
        expect(result.autoResult.masons).toHaveLength(1);
        expect(result.message).toContain("Mason");
      });

      it("should clone Insomniac", () => {
        const { clonePlayer, targetPlayer, clone } = setupCloneTest(new Insomniac());

        const action = createCloneAction(targetPlayer);
        const result = clone.performAction()(game, clonePlayer, action);

        expect(result.clonedRole).toBe("Insomniac");
        expect(result.needsSecondAction).toBe(false);
        expect(clonePlayer.getRole().name).toBe("Insomniac");
        expect(result.message).toContain("Insomniac");
      });

      it("should clone Joker", () => {
        const { clonePlayer, targetPlayer, clone } = setupCloneTest(new Joker());

        const action = createCloneAction(targetPlayer);
        const result = clone.performAction()(game, clonePlayer, action);

        expect(result.clonedRole).toBe("Joker");
        expect(result.needsSecondAction).toBe(false);
        expect(clonePlayer.getRole().name).toBe("Joker");
        expect(result.message).toContain("Joker");
      });
    });

    describe("Active Roles", () => {
      it("should clone Seer and indicate second action needed", () => {
        const { clonePlayer, targetPlayer, clone } = setupCloneTest(new Seer());

        const action = createCloneAction(targetPlayer);
        const result = clone.performAction()(game, clonePlayer, action);

        expect(result.clonedRole).toBe("Seer");
        expect(result.needsSecondAction).toBe(true);
        expect(clonePlayer.getRole().name).toBe("Seer");
        expect(result.groundCards).toBeDefined();
        expect(result.otherPlayers).toBeDefined();
        expect(result.message).toContain("perform their action");
      });

      it("should clone Robber and indicate second action needed", () => {
        const { clonePlayer, targetPlayer, clone } = setupCloneTest(new Robber());

        const action = createCloneAction(targetPlayer);
        const result = clone.performAction()(game, clonePlayer, action);

        expect(result.clonedRole).toBe("Robber");
        expect(result.needsSecondAction).toBe(true);
        expect(clonePlayer.getRole().name).toBe("Robber");
        expect(result.otherPlayers).toBeDefined();
        expect(result.message).toContain("perform their action");
      });

      it("should clone Troublemaker and indicate second action needed", () => {
        const { clonePlayer, targetPlayer, clone } = setupCloneTest(new Troublemaker());

        const action = createCloneAction(targetPlayer);
        const result = clone.performAction()(game, clonePlayer, action);

        expect(result.clonedRole).toBe("Troublemaker");
        expect(result.needsSecondAction).toBe(true);
        expect(clonePlayer.getRole().name).toBe("Troublemaker");
        expect(result.otherPlayers).toBeDefined();
        expect(result.message).toContain("perform their action");
      });

      it("should clone Drunk and indicate second action needed", () => {
        const { clonePlayer, targetPlayer, clone } = setupCloneTest(new Drunk());

        const action = createCloneAction(targetPlayer);
        const result = clone.performAction()(game, clonePlayer, action);

        expect(result.clonedRole).toBe("Drunk");
        expect(result.needsSecondAction).toBe(true);
        expect(clonePlayer.getRole().name).toBe("Drunk");
        expect(result.groundCards).toBeDefined();
        expect(result.message).toContain("perform their action");
      });
    });

    it("should throw when cloning themselves", () => {
      const { clonePlayer, clone } = setupCloneTest(new Werewolf());

      const action = createCloneAction(clonePlayer);
      expect(() => {
        clone.performAction()(game, clonePlayer, action);
      }).toThrow("Clone cannot target themselves");
    });

    it("should throw on invalid action", () => {
      const { clonePlayer, clone } = setupCloneTest(new Werewolf());

      const invalidAction = { type: "invalid" };
      expect(() => {
        clone.performAction()(game, clonePlayer, invalidAction);
      }).toThrow("Invalid action for Clone");
    });
  });

  describe("Role Properties", () => {
    it("should have correct team assignments", () => {
      const werewolf = new Werewolf();
      const minion = new Minion();
      const seer = new Seer();
      const mason = new Mason();
      const drunk = new Drunk();
      const insomniac = new Insomniac();

      expect(werewolf.team).toBe(Team.Villains);
      expect(minion.team).toBe(Team.Villains);
      expect(seer.team).toBe(Team.Heroes);
      expect(mason.team).toBe(Team.Heroes);
      expect(drunk.team).toBe(Team.Heroes);
      expect(insomniac.team).toBe(Team.Heroes);
    });

    it("should have unique ids", () => {
      const werewolf1 = new Werewolf();
      const werewolf2 = new Werewolf();

      expect(werewolf1.id).not.toBe(werewolf2.id);
    });

    it("should have descriptions", () => {
      const werewolf = new Werewolf();
      const seer = new Seer();
      const minion = new Minion();

      expect(werewolf.description).toBeTruthy();
      expect(seer.description).toBeTruthy();
      expect(minion.description).toBeTruthy();
    });

    it("should have correct names", () => {
      const roles = [
        new Werewolf(),
        new Seer(),
        new Minion(),
        new Mason(),
        new Drunk(),
        new Robber(),
        new Troublemaker(),
        new Joker(),
        new Insomniac(),
        new Clone(),
      ];

      const expectedNames = [
        "Werewolf",
        "Seer",
        "Minion",
        "Mason",
        "Drunk",
        "Robber",
        "Troublemaker",
        "Joker",
        "Insomniac",
        "Clone",
      ];

      roles.forEach((role, index) => {
        expect(role.name).toBe(expectedNames[index]);
      });
    });
  });
});
