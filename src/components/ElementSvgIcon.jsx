import { BridgeIcon as Bridge } from '@phosphor-icons/react/dist/csr/Bridge';
import { CloudIcon as Cloud } from '@phosphor-icons/react/dist/csr/Cloud';
import { CloudRainIcon as CloudRain } from '@phosphor-icons/react/dist/csr/CloudRain';
import { DropIcon as Drop } from '@phosphor-icons/react/dist/csr/Drop';
import { FlowerIcon as Flower } from '@phosphor-icons/react/dist/csr/Flower';
import { FlowerTulipIcon as FlowerTulip } from '@phosphor-icons/react/dist/csr/FlowerTulip';
import { GrainsIcon as Grains } from '@phosphor-icons/react/dist/csr/Grains';
import { LampIcon as Lamp } from '@phosphor-icons/react/dist/csr/Lamp';
import { LeafIcon as Leaf } from '@phosphor-icons/react/dist/csr/Leaf';
import { LightbulbFilamentIcon as LightbulbFilament } from '@phosphor-icons/react/dist/csr/LightbulbFilament';
import { MoonIcon as Moon } from '@phosphor-icons/react/dist/csr/Moon';
import { MoonStarsIcon as MoonStars } from '@phosphor-icons/react/dist/csr/MoonStars';
import { PathIcon as Path } from '@phosphor-icons/react/dist/csr/Path';
import { PlantIcon as Plant } from '@phosphor-icons/react/dist/csr/Plant';
import { PottedPlantIcon as PottedPlant } from '@phosphor-icons/react/dist/csr/PottedPlant';
import { RainbowIcon as Rainbow } from '@phosphor-icons/react/dist/csr/Rainbow';
import { ShootingStarIcon as ShootingStar } from '@phosphor-icons/react/dist/csr/ShootingStar';
import { SparkleIcon as Sparkle } from '@phosphor-icons/react/dist/csr/Sparkle';
import { StarIcon as Star } from '@phosphor-icons/react/dist/csr/Star';
import { SunHorizonIcon as SunHorizon } from '@phosphor-icons/react/dist/csr/SunHorizon';
import { TreeIcon as Tree } from '@phosphor-icons/react/dist/csr/Tree';
import { WavesIcon as Waves } from '@phosphor-icons/react/dist/csr/Waves';
import React from 'react';

const ICONS = {
  seed: Grains,
  memorySeed: Grains,
  grass: Plant,
  reed: Plant,
  sprout: Plant,
  smallTree: Tree,
  sunlight: SunHorizon,
  sun: SunHorizon,
  dew: Drop,
  rain: CloudRain,
  rainDrop: CloudRain,
  soilLine: Path,
  flower: Flower,
  firstFlower: Flower,
  bud: FlowerTulip,
  quietFlower: FlowerTulip,
  waterLine: Waves,
  ripple: Waves,
  puddle: Drop,
  leafBoat: Leaf,
  floatingLeaf: Leaf,
  bridge: Bridge,
  stone: Path,
  moss: Plant,
  windLine: Waves,
  softWind: Waves,
  cloud: Cloud,
  windBell: Lamp,
  ribbon: Sparkle,
  breathLight: LightbulbFilament,
  lantern: Lamp,
  firefly: Sparkle,
  moon: Moon,
  moonbeam: MoonStars,
  windowLight: LightbulbFilament,
  star: Star,
  constellationLine: ShootingStar,
  rainbow: Rainbow,
  mushroom: PottedPlant,
  snailTrail: Path,
  signpost: Bridge,
  shadow: Cloud,
};

function ElementSvgIcon({ toolId, size = 34 }) {
  const Icon = ICONS[toolId] || Sparkle;
  return (
    <span className="external-svg-glyph" aria-hidden="true">
      <Icon size={size} weight="duotone" />
    </span>
  );
}

export default ElementSvgIcon;
