import React, { useState } from 'react';
import { InventoryItem } from '../types.js';
import { Shield, Sparkles, Sword, Pickaxe, Apple, Box } from 'lucide-react';

interface MinecraftItemIconProps {
  item: InventoryItem;
  size?: number;
}

export function MinecraftItemIcon({ item, size = 32 }: MinecraftItemIconProps) {
  const [imgError, setImgError] = useState(false);
  const [altSourceIndex, setAltSourceIndex] = useState(0);

  const cleanName = item.name.toLowerCase().replace(/^minecraft:/, '');

  const sources = [
    `https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.20.4/items/${cleanName}.png`,
    `https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.20.4/blocks/${cleanName}.png`,
    `https://assets.mcasset.cloud/1.20.4/assets/minecraft/textures/item/${cleanName}.png`,
  ];

  const handleImageError = () => {
    if (altSourceIndex < sources.length - 1) {
      setAltSourceIndex(prev => prev + 1);
    } else {
      setImgError(true);
    }
  };

  // Fallback icon based on item type
  const renderFallbackIcon = () => {
    if (cleanName.includes('sword')) return <Sword className="w-5 h-5 text-cyan-400" />;
    if (cleanName.includes('pickaxe') || cleanName.includes('axe') || cleanName.includes('shovel')) {
      return <Pickaxe className="w-5 h-5 text-amber-300" />;
    }
    if (cleanName.includes('helmet') || cleanName.includes('chestplate') || cleanName.includes('leggings') || cleanName.includes('boots') || cleanName.includes('shield')) {
      return <Shield className="w-5 h-5 text-sky-400" />;
    }
    if (cleanName.includes('apple') || cleanName.includes('bread') || cleanName.includes('beef') || cleanName.includes('pork') || cleanName.includes('carrot')) {
      return <Apple className="w-5 h-5 text-orange-400" />;
    }
    if (cleanName.includes('totem') || cleanName.includes('potion') || cleanName.includes('star') || cleanName.includes('pearl')) {
      return <Sparkles className="w-5 h-5 text-purple-400" />;
    }
    return <Box className="w-5 h-5 text-emerald-400" />;
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center select-none group">
      {!imgError ? (
        <img
          src={sources[altSourceIndex]}
          alt={item.displayName}
          onError={handleImageError}
          className="object-contain filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] image-rendering-pixelated transition-transform group-hover:scale-110"
          style={{ width: `${size}px`, height: `${size}px` }}
          loading="lazy"
        />
      ) : (
        <div className="flex flex-col items-center justify-center p-0.5">
          {renderFallbackIcon()}
          <span className="text-[8px] font-mono font-bold uppercase text-neutral-300 truncate max-w-[38px] mt-0.5">
            {cleanName.slice(0, 4)}
          </span>
        </div>
      )}

      {/* Stack Count (Minecraft Style) */}
      {item.count > 1 && (
        <span
          className="absolute -bottom-0.5 -right-0.5 text-xs font-bold font-mono text-white leading-none px-1 py-0.5 drop-shadow-[1px_1px_0px_#000000] z-10"
          style={{ textShadow: '1px 1px 0 #111, -1px -1px 0 #111, 1px -1px 0 #111, -1px 1px 0 #111' }}
        >
          {item.count}
        </span>
      )}
    </div>
  );
}
