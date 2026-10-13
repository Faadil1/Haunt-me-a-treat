-- Fires the HUD's "bumped" trigger whenever Costume.candies changes, so the
-- state machine's Idle -> Bump transition (bounce + glow) plays on every
-- candy pickup, without a timeline per event.
type CandyWatcher = {
  vm: ViewModel?,
  candies: Property<number>?,
  bumped: PropertyTrigger?,
}

local function onCandiesChanged(self: CandyWatcher)
  local bumped = self.bumped
  if bumped then
    bumped:fire()
  end
end

function init(self: CandyWatcher, context: Context): boolean
  local vm = context:viewModel()
  if vm == nil then
    return true
  end
  self.vm = vm
  local candies = vm:getNumber('candies')
  self.candies = candies
  self.bumped = vm:getTrigger('bumped')
  if candies then
    candies:addListener(self, onCandiesChanged)
  end
  return true
end

function advance(self: CandyWatcher, seconds: number): boolean
  return false
end

function draw(self: CandyWatcher, renderer: Renderer) end

return function(): Node<CandyWatcher>
  return {
    vm = nil,
    candies = nil,
    bumped = nil,
    init = init,
    advance = advance,
    draw = draw,
  }
end
