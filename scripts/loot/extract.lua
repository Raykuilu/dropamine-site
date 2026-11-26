-- Extrait les tables de butin d'AtlasLoot Forever (GPL-2.0) vers site/data/loot.json.
-- On exécute les fichiers de données de l'addon dans un Lua autonome, avec une fausse API du jeu,
-- puis on écrit : donjon → boss → objets (avec le taux de drop quand AtlasLoot le connaît).
-- Usage : lua scripts/loot/extract.lua "<dossier AddOns>" > site/data/loot.json
local ADDONS = assert(arg[1], "dossier AddOns manquant")
local DIR = ADDONS .. "/AtlasLootClassic_DungeonsAndRaids/"

-- ---- fausse API ----
getfenv = function() return _G end
local function keyName(t) return setmetatable({}, { __index = function(_, k) return k end }) end
UnitFactionGroup = function() return "Alliance" end
FACTION_HORDE, FACTION_ALLIANCE = "Horde", "Alliance"
C_Map = { GetAreaInfo = function(id) return "" end }
C_Seasons = nil
-- le bout d'interface en fin de fichier : un faux cadre qui accepte tout
local function nothing() return setmetatable({}, { __index = function() return function() return nothing() end end }) end
CreateFrame = function() return nothing() end
-- constantes globales d'AtlasLoot (ATLASLOOT_IT_AMOUNT1…) : leur propre nom suffit
setmetatable(_G, { __index = function(_, k) if type(k) == "string" and k:match("^ATLASLOOT_") then return k end end })
local FR = {}
local data = {}
local diffs = {}
local db = {
  AddDifficulty = function(self, name) diffs[#diffs + 1] = name return name end,
  AddItemTableType = function(self, n) return n end,
  AddExtraItemTableType = function(self, n) return n end,
  AddContentType = function(self, n) return n end,
}
setmetatable(db, { __index = function() return function(_, n) return n end end })
setmetatable(data, { __index = db })
local drop = {}
AtlasLoot = {
  ItemDB = { Add = function() return data end },
  Locales = keyName(),
  ReturnForGameVersion = function(a) return a end,
  CLASSIC_VERSION_NUM = 1,
  Data = { Droprate = { AddData = function(_, t) drop = t end } },
  GetLocales = function(loc) if loc == "frFR" then return FR end end,
}
-- toute autre fonction d'AtlasLoot (ex. GameVersion_GE) : réponse neutre
setmetatable(AtlasLoot, { __index = function() return function() return false end end })
local function run(file)
  local f = assert(loadfile(DIR .. file))
  f("AtlasLootClassic_DungeonsAndRaids")
end
run("data.lua")
run("droprate.lua")
run("Locales/constants.fr.lua")

-- ---- sortie JSON ----
local function q(s) return '"' .. tostring(s):gsub('[\\"]', '\\%0'):gsub("\n", " ") .. '"' end
local function human(key) return (key:gsub("(%l)(%u)", "%1 %2"):gsub("(%a)(%u%l)", "%1 %2")) end
local function strip(s) return (tostring(s or ""):gsub("|c%x%x%x%x%x%x%x%x", ""):gsub("|r", ""):gsub("|T.-|t", ""):gsub("%s+$", "")) end

local keys = {}
for k, v in pairs(data) do if type(v) == "table" and type(v.items) == "table" then keys[#keys + 1] = k end end
table.sort(keys)
local out = {}
for _, k in ipairs(keys) do
  local d = data[k]
  local lr = type(d.LevelRange) == "table" and d.LevelRange or {}
  local bosses = {}
  for _, b in ipairs(d.items) do
    if type(b) == "table" then
      local items, seen = {}, {}
      for key, list in pairs(b) do
        if type(list) == "table" and key ~= "DisplayIDs" and key ~= "ExtraList" then
          for _, e in ipairs(list) do
            local id = type(e) == "table" and tonumber(e[2])
            if id and id > 0 and not seen[id] then
              seen[id] = true
              local r = b.npcID and drop[b.npcID] and drop[b.npcID][id]
              items[#items + 1] = r and ("[" .. id .. "," .. r .. "]") or tostring(id)
            end
          end
        end
      end
      if #items > 0 then
        local en = strip(b.name)
        bosses[#bosses + 1] = "{" .. q("n") .. ":[" .. q(en) .. "," .. q(strip(FR[b.name] or en)) .. "]," ..
          (b.npcID and (q("npc") .. ":" .. tonumber(type(b.npcID) == "table" and b.npcID[1] or b.npcID) .. ",") or "") ..
          q("i") .. ":[" .. table.concat(items, ",") .. "]}"
      end
    end
  end
  if #bosses > 0 then
    out[#out + 1] = "{" .. q("key") .. ":" .. q(k) .. "," .. q("name") .. ":" .. q(human(k)) .. "," ..
      q("map") .. ":" .. tostring(tonumber(d.MapID) or 0) .. "," ..
      q("lvl") .. ":[" .. tostring(lr[1] or 0) .. "," .. tostring(lr[2] or 0) .. "," .. tostring(lr[3] or 0) .. "]," ..
      q("bosses") .. ":[" .. table.concat(bosses, ",") .. "]}"
  end
end
-- noms anglais des objets propres à Forever (identifiant ≥ 200000) : l'API Blizzard ne les connaît pas,
-- AtlasLoot les note en commentaire de chaque ligne ({ 17, 274043 }, -- Irradiated Shield)
local names, seenName = {}, {}
for line in io.lines(DIR .. "data.lua") do
  local id, nm = line:match("{%s*%d+%s*,%s*(%d+)%s*}%s*,?%s*%-%-%s*(.-)%s*$")
  id = tonumber(id)
  if id and id >= 200000 and nm ~= "" and not seenName[id] then seenName[id] = true names[#names + 1] = q(tostring(id)) .. ":" .. q(nm) end
end
io.write('{"source":"AtlasLoot Forever (AtlasLootClassic_DungeonsAndRaids), GPL-2.0","dungeons":[', table.concat(out, ","), '],"names":{', table.concat(names, ","), "}}\n")
