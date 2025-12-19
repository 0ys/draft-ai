import React from 'react';
import Image from 'next/image';

type IconProps = {
  name: string;
  size?: number;
  className?: string;
  alt?: string;
};

/**
 * public/icons/ 폴더의 SVG 파일을 아이콘 컴포넌트로 사용
 * 
 * @example
 * <Icon name="file-text" size={24} />
 */
export function Icon({ 
  name, 
  size = 24, 
  className,
  alt 
}: IconProps) {
  return (
    <Image
      src={`/icons/${name}.svg`}
      alt={alt || name}
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size }}
    />
  );
}

