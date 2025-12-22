import styled from '@emotion/styled';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { googleLogin } from '@/apis/auth';
import { setAccessToken, setUser } from '@/utils/auth';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (element: HTMLElement, config: { theme?: string; size?: string; width?: string }) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export function Login() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = useCallback(async (response: { credential: string }) => {
    setIsLoading(true);
    setError(null);

    try {
      // 백엔드로 구글 ID 토큰 전송
      const result = await googleLogin(response.credential);

      // 토큰과 사용자 정보 저장
      setAccessToken(result.access_token);
      setUser(result.user);

      // 대시보드로 리다이렉트
      router.push('/dashboard');
    } catch (err: any) {
      console.error('구글 로그인 실패:', err);
      setError(err.response?.data?.detail || '로그인에 실패했습니다. 다시 시도해주세요.');
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    // Google GSI 스크립트가 로드되었는지 확인
    if (!window.google) {
      // 스크립트가 아직 로드되지 않은 경우, 짧은 지연 후 재시도
      const checkInterval = setInterval(() => {
        if (window.google) {
          clearInterval(checkInterval);
          initializeGoogleSignIn();
        }
      }, 100);

      // 최대 5초 대기 후 타임아웃
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!window.google) {
          setError('Google 로그인 스크립트를 로드할 수 없습니다. 페이지를 새로고침해주세요.');
        }
      }, 5000);

      return () => clearInterval(checkInterval);
    } else {
      initializeGoogleSignIn();
    }

    function initializeGoogleSignIn() {
      if (!window.google) return;

      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      if (!clientId) {
        console.error('Google Client ID가 설정되지 않았습니다.');
        setError('Google Client ID가 설정되지 않았습니다. 환경 변수를 확인해주세요.');
        return;
      }

      // 디버깅: 현재 origin과 Client ID 출력
      const currentOrigin = window.location.origin;
      console.log('🔍 Google 로그인 디버깅 정보:');
      console.log('  - Current Origin:', currentOrigin);
      console.log('  - Client ID:', clientId);
      console.log('  - Full URL:', window.location.href);
      console.log('  - ⚠️ Google Console에 다음 origin이 등록되어 있는지 확인하세요:');
      console.log('    ', currentOrigin);

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleSignIn,
      });

      // 구글 로그인 버튼 렌더링
      const buttonContainer = document.getElementById('google-signin-button');
      if (buttonContainer && window.google.accounts.id.renderButton) {
        window.google.accounts.id.renderButton(buttonContainer, {
          theme: 'outline',
          size: 'large',
          width: '300',
        });
      }
    }
  }, [handleGoogleSignIn]);

  return (
    <Wrapper>
      <Container>
        <Header>
          <Title>draft-ai</Title>
          <Subtitle>RAG 기반 보고서 초안 생성기</Subtitle>
        </Header>

        {error && (
          <ErrorBox>
            <p>{error}</p>
          </ErrorBox>
        )}

        <GoogleSignInContainer>
          {isLoading ? (
            <LoadingText>로그인 중...</LoadingText>
          ) : (
            <div id="google-signin-button"></div>
          )}
        </GoogleSignInContainer>

        <Divider>
          <DividerLine />
          <DividerText>또는</DividerText>
          <DividerLine />
        </Divider>

        <MvpNotice>
          <p>구글 계정으로 로그인하여 서비스를 이용하세요.</p>
        </MvpNotice>
      </Container>
    </Wrapper>
  );
}

const Wrapper = styled.main`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem 1rem;
  background-color: ${({ theme }) => theme.colors.Slate50};
`;

const Container = styled.div`
  width: 100%;
  max-width: 28rem;
  padding: 2rem;
  background-color: ${({ theme }) => theme.colors.White};
  border: 1px solid ${({ theme }) => theme.colors.Slate200};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  box-shadow: ${({ theme }) => theme.shadows.card};
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  ${({ theme }) => theme.fonts.Title1};
  color: ${({ theme }) => theme.colors.Slate950};
  margin-bottom: 0.5rem;
`;

const Subtitle = styled.p`
  ${({ theme }) => theme.fonts.Body2};
  color: ${({ theme }) => theme.colors.Slate500};
`;

const GoogleSignInContainer = styled.div`
  width: 100%;
  margin-bottom: 1.5rem;
  display: flex;
  justify-content: center;
  
  #google-signin-button {
    display: flex;
    justify-content: center;
  }
`;

const LoadingText = styled.div`
  ${({ theme }) => theme.fonts.Body1};
  color: ${({ theme }) => theme.colors.Slate700};
  text-align: center;
  padding: 1rem;
`;

const Divider = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 1.5rem 0;
`;

const DividerLine = styled.div`
  flex: 1;
  height: 1px;
  background-color: ${({ theme }) => theme.colors.Slate200};
`;

const DividerText = styled.span`
  ${({ theme }) => theme.fonts.Caption};
  color: ${({ theme }) => theme.colors.Slate500};
`;

const ErrorBox = styled.div`
  margin-bottom: 1.5rem;
  padding: 0.75rem 1rem;
  background-color: ${({ theme }) => theme.colors.Slate100};
  border: 1px solid ${({ theme }) => theme.colors.Red};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  
  p {
    ${({ theme }) => theme.fonts.Body2};
    color: ${({ theme }) => theme.colors.Red};
    margin: 0;
    text-align: center;
  }
`;

const MvpNotice = styled.div`
  margin-top: 1.5rem;
  padding: 1rem;
  background-color: ${({ theme }) => theme.colors.Slate100};
  border: 1px solid ${({ theme }) => theme.colors.Slate200};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  
  p {
    ${({ theme }) => theme.fonts.Caption};
    color: ${({ theme }) => theme.colors.Slate500};
    text-align: center;
    margin: 0;
  }
`;

