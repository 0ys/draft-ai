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
 * <SvgIcon name="file" size={24} color="#2563EB" />
 */
export function SvgIcon({ 
  name, 
  size = 24, 
  color,
  className 
}: SvgIconProps) {
  const [svgContent, setSvgContent] = useState<string>('');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    
    fetch(`/icons/${name}.svg`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load icon: ${name} (${res.status})`);
        }
        return res.text();
      })
      .then((text) => {
        if (!text || text.trim() === '') {
          throw new Error(`Empty SVG content for icon: ${name}`);
        }
        
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
        // SVG의 width와 height를 size에 맞게 변경
        processedSvg = processedSvg.replace(
          /width="[^"]*"/g,
          `width="${size}"`
        );
        processedSvg = processedSvg.replace(
          /height="[^"]*"/g,
          `height="${size}"`
        );
        setSvgContent(processedSvg);
      })
      .catch((err) => {
        console.error(`Failed to load icon: ${name}`, err);
        // 에러 발생 시 빈 문자열로 설정하여 로딩 상태 유지
        setSvgContent('');
      });
  }, [name, color, size, isMounted]);

  // 서버와 클라이언트 초기 렌더링 시 동일한 빈 span 반환
  if (!isMounted) {
    return (
      <span
        style={{
          width: size,
          height: size,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        className={className}
        suppressHydrationWarning
      />
    );
  }

  // 클라이언트에서 마운트된 후 SVG 로딩 중
  if (!svgContent) {
    return (
      <span
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

  // SVG 로드 완료
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

