'use client';

import React, { useState, useEffect } from 'react';

type SvgIconProps = {
  name: string;
  size?: number;
  color?: string;
  className?: string;
};

/**
 * public/icons/ 폴더의 SVG 파일을 인라인으로 로드하여 색상 변경 가능
 * 
 * @example
 * <SvgIcon name="file-text" size={24} color="#2563EB" />
 */
export function SvgIcon({ 
  name, 
  size = 24, 
  color,
  className 
}: SvgIconProps) {
  const [svgContent, setSvgContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`/icons/${name}.svg`)
      .then((res) => res.text())
      .then((text) => {
        // 색상이 지정된 경우 SVG의 stroke/fill을 변경
        let processedSvg = text;
        if (color) {
          // stroke 색상 변경
          processedSvg = processedSvg.replace(
            /stroke="[^"]*"/g,
            `stroke="${color}"`
          );
          // fill 색상 변경 (currentColor가 아닌 경우)
          processedSvg = processedSvg.replace(
            /fill="(?!none|currentColor)[^"]*"/g,
            `fill="${color}"`
          );
        }
        setSvgContent(processedSvg);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(`Failed to load icon: ${name}`, err);
        setIsLoading(false);
      });
  }, [name, color]);

  if (isLoading) {
    return (
      <div
        style={{
          width: size,
          height: size,
          display: 'inline-block',
        }}
        className={className}
      />
    );
  }

  return (
    <span
      dangerouslySetInnerHTML={{ __html: svgContent }}
      style={{
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      className={className}
    />
  );
}

