"use strict";
// Exports all roles in one place
// Example: export { Werewolf, Seer, Robber, ... }
// Also exports RoleClasses object for dynamic role creation
// Used by: Game.ts (when assigning roles), actionFactory.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleClasses = exports.Werewolf = exports.Troublemaker = exports.Seer = exports.Robber = exports.Minion = exports.Mason = exports.Joker = exports.Insomniac = exports.Drunk = exports.Clone = void 0;
const Drunk_1 = require("./Drunk");
const Insomniac_1 = require("./Insomniac");
const Mason_1 = require("./Mason");
const Minion_1 = require("./Minion");
const Robber_1 = require("./Robber");
const Seer_1 = require("./Seer");
const Clone_1 = require("./Clone");
const Troublemaker_1 = require("./Troublemaker");
const Werewolf_1 = require("./Werewolf");
const Joker_1 = require("./Joker");
var Clone_2 = require("./Clone");
Object.defineProperty(exports, "Clone", { enumerable: true, get: function () { return Clone_2.Clone; } });
var Drunk_2 = require("./Drunk");
Object.defineProperty(exports, "Drunk", { enumerable: true, get: function () { return Drunk_2.Drunk; } });
var Insomniac_2 = require("./Insomniac");
Object.defineProperty(exports, "Insomniac", { enumerable: true, get: function () { return Insomniac_2.Insomniac; } });
var Joker_2 = require("./Joker");
Object.defineProperty(exports, "Joker", { enumerable: true, get: function () { return Joker_2.Joker; } });
var Mason_2 = require("./Mason");
Object.defineProperty(exports, "Mason", { enumerable: true, get: function () { return Mason_2.Mason; } });
var Minion_2 = require("./Minion");
Object.defineProperty(exports, "Minion", { enumerable: true, get: function () { return Minion_2.Minion; } });
var Robber_2 = require("./Robber");
Object.defineProperty(exports, "Robber", { enumerable: true, get: function () { return Robber_2.Robber; } });
var Seer_2 = require("./Seer");
Object.defineProperty(exports, "Seer", { enumerable: true, get: function () { return Seer_2.Seer; } });
var Troublemaker_2 = require("./Troublemaker");
Object.defineProperty(exports, "Troublemaker", { enumerable: true, get: function () { return Troublemaker_2.Troublemaker; } });
var Werewolf_2 = require("./Werewolf");
Object.defineProperty(exports, "Werewolf", { enumerable: true, get: function () { return Werewolf_2.Werewolf; } });
exports.RoleClasses = {
    werewolf: Werewolf_1.Werewolf,
    mason: Mason_1.Mason,
    seer: Seer_1.Seer,
    robber: Robber_1.Robber,
    troublemaker: Troublemaker_1.Troublemaker,
    drunk: Drunk_1.Drunk,
    minion: Minion_1.Minion,
    clone: Clone_1.Clone,
    insomniac: Insomniac_1.Insomniac,
    joker: Joker_1.Joker,
};
