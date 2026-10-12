--!strict
-- NuitFX : script Node qui dessine le shader WGSL `NuitFX` dans un GPU Canvas plein artboard.
--
-- Deux instances de ce script dans la hiérarchie de l'artboard Main :
--   NuitFX_Derriere (layer = 0) : entre Decor et Habitants  → halo de lampe, rayon de lune, aura du drap
--   NuitFX_Devant   (layer = 1) : au-dessus de Drap          → brume au sol, vignettage
--
-- Entrées à lier au View Model `Costume` (clic droit sur l'entrée → Data Bind) :
--   scary ← faceScary, headX ← faceHeadX, headY ← faceHeadY, door ← doorIndex, horror ← horror
--
-- Si le GPU Canvas n'est pas disponible (ancien runtime, aperçu), le script ne dessine rien :
-- le jeu reste jouable.
--
-- LES LIGNES MARQUÉES « VÉRIFIER » utilisent des champs de descripteur non documentés publiquement
-- (GPUBuffer.new, GPUBindGroup.new). Corrige-les avec l'autocomplétion / les types de l'éditeur.

type NuitFX = {
  layer: Input<number>,      -- 0 = derrière, 1 = devant
  scary: Input<number>,      -- faceScary (0 → 1)
  headX: Input<number>,      -- faceHeadX (-1 → 1)
  headY: Input<number>,      -- faceHeadY (-1 → 1)
  door: Input<number>,       -- doorIndex : 0 = rue (pas de lampe), 1 à 4 = porches
  ghostX: Input<number>,     -- position de repos du centre du drap, en UV (0 → 1)
  ghostY: Input<number>,
  flipY: Input<number>,      -- passe à 1 si la brume apparaît en haut au lieu d'en bas
  horror: Input<number>,     -- horror (0 → 1) : la révélation (sang, lampe rouge, battement)

  canvas: GPUCanvas?,
  pipeline: GPUPipeline?,
  ubo: GPUBuffer?,
  bindGroup: GPUBindGroup?,
  sampler: ImageSampler?,
  data: buffer,
  t: number,
  lamp: number,
}

local W, H = 1920, 1080
local UBO_SIZE = 48 -- 12 floats, voir la struct Uniforms dans NuitFX.wgsl

-- Position de la lampe au-dessus de chaque porte, en UV (mesurée sur les rendus Blender).
local LAMP = {
  [1] = { 0.500, 0.50 },
  [2] = { 0.500, 0.48 },
  [3] = { 0.500, 0.50 },
  [4] = { 0.503, 0.55 },
}

function init(self: NuitFX, context: Context): boolean
  self.data = buffer.create(UBO_SIZE)

  local ok, err = pcall(function()
    local canvas = context:gpuCanvas({ width = W, height = H })
    local shader = context:shader('NuitFX')
    if not shader then
      print('NuitFX : shader introuvable (le script WGSL doit s\'appeler NuitFX)')
      return
    end

    local pipeline = GPUPipeline.new({
      vertex = shader,
      fragment = shader,
      vertexLayout = {},
      colorTargets = { { format = canvas.format } },
    })

    -- VÉRIFIER : champs du descripteur de GPUBuffer (taille + usage uniforme).
    local ubo = GPUBuffer.new({ size = UBO_SIZE, usage = 'uniform' })

    -- VÉRIFIER : champs du descripteur de GPUBindGroup (layout + entrées binding/buffer).
    local bindGroup = GPUBindGroup.new({
      layout = pipeline:getBindGroupLayout(0),
      entries = { { binding = 0, buffer = ubo } },
    })

    self.canvas = canvas
    self.pipeline = pipeline
    self.ubo = ubo
    self.bindGroup = bindGroup
  end)

  if not ok then
    print('NuitFX désactivé : ' .. tostring(err))
    self.canvas = nil
  end

  self.sampler = ImageSampler('clamp', 'clamp', 'bilinear')
  return true
end

function advance(self: NuitFX, seconds: number): boolean
  self.t += seconds
  -- la lampe s'allume / s'éteint en douceur quand on change de porte
  local target = (self.door >= 1 and self.door <= 4) and 1 or 0
  self.lamp += (target - self.lamp) * math.min(1, seconds * 3)
  return true
end

local function writeUniforms(self: NuitFX)
  local d = self.data
  local lp = LAMP[math.floor(self.door + 0.5)] or LAMP[1]
  -- même conversion que les liaisons du groupe Drap : X ← headX × 120 px, Y ← headY × 60 px
  local gx = self.ghostX + self.headX * 120 / W
  local gy = self.ghostY + self.headY * 60 / H
  buffer.writef32(d, 0, self.t)
  buffer.writef32(d, 4, self.layer)
  buffer.writef32(d, 8, self.lamp)
  buffer.writef32(d, 12, math.clamp(self.scary, 0, 1))
  buffer.writef32(d, 16, gx)
  buffer.writef32(d, 20, gy)
  buffer.writef32(d, 24, lp[1])
  buffer.writef32(d, 28, lp[2])
  buffer.writef32(d, 32, W / H)
  buffer.writef32(d, 36, self.flipY)
  buffer.writef32(d, 40, math.clamp(self.horror, 0, 1))
  buffer.writef32(d, 44, 0)
end

function draw(self: NuitFX, renderer: Renderer)
  local canvas, pipeline, ubo, bindGroup = self.canvas, self.pipeline, self.ubo, self.bindGroup
  if not (canvas and pipeline and ubo and bindGroup and self.sampler) then
    return
  end

  writeUniforms(self)
  ubo:write(self.data)

  local pass = canvas:beginRenderPass({
    color = {
      { loadOp = 'clear', storeOp = 'store', clearColor = { 0, 0, 0, 0 } },
    },
  })
  pass:setPipeline(pipeline)
  pass:setBindGroup(0, bindGroup)
  pass:draw(3)
  pass:finish()

  renderer:drawImage(canvas.image, self.sampler, 'srcOver', 1)
end

return function(): Node<NuitFX>
  return {
    layer = 0,
    scary = 0,
    headX = 0,
    headY = 0,
    door = 0,
    ghostX = 0.5,
    ghostY = 0.75,
    flipY = 0,
    horror = 0,

    canvas = nil,
    pipeline = nil,
    ubo = nil,
    bindGroup = nil,
    sampler = nil,
    data = buffer.create(48),
    t = 0,
    lamp = 0,

    init = init,
    advance = advance,
    draw = draw,
  }
end
