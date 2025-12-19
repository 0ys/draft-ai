import styled from '@emotion/styled';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    // MVP: 간단한 인증 로직 (실제로는 서버 API 호출)
    setTimeout(() => {
      router.push('/dashboard');
    }, 500);
  };

  return (
    <Wrapper>
      <Container>
        <Header>
          <Title>draft-ai</Title>
          <Subtitle>민원 Q&A 기반 보고서 초안 생성기</Subtitle>
        </Header>

        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="password">비밀번호</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </FormGroup>

          <SubmitButton type="submit" disabled={isLoading}>
            {isLoading ? '로그인 중...' : '로그인'}
          </SubmitButton>
        </Form>

        <MvpNotice>
          <p>MVP 버전: 이메일과 비밀번호를 입력하면 바로 로그인됩니다.</p>
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
  background-color: ${({ theme }) => theme.colors.Black1};
`;

const Container = styled.div`
  width: 100%;
  max-width: 28rem;
  padding: 2rem;
  background-color: ${({ theme }) => theme.colors.Black2};
  border: 1px solid ${({ theme }) => theme.colors.Black4};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  ${({ theme }) => theme.fonts.Title2};
  color: ${({ theme }) => theme.colors.Gray1};
  margin-bottom: 0.5rem;
`;

const Subtitle = styled.p`
  ${({ theme }) => theme.fonts.Body2};
  color: ${({ theme }) => theme.colors.Gray4};
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const Label = styled.label`
  ${({ theme }) => theme.fonts.Body2};
  font-weight: 500;
  color: ${({ theme }) => theme.colors.Gray3};
  margin-bottom: 0.5rem;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem 1rem;
  background-color: ${({ theme }) => theme.colors.Black3};
  border: 1px solid ${({ theme }) => theme.colors.Black4};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  color: ${({ theme }) => theme.colors.Gray1};
  ${({ theme }) => theme.fonts.Body1};

  &::placeholder {
    color: ${({ theme }) => theme.colors.Gray5};
  }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.Sky};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.Sky}33;
  }
`;

const SubmitButton = styled.button`
  width: 100%;
  padding: 0.75rem 1rem;
  background-color: ${({ theme }) => theme.colors.SkyDark};
  color: ${({ theme }) => theme.colors.White};
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  ${({ theme }) => theme.fonts.Body1};
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover:not(:disabled) {
    background-color: ${({ theme }) => theme.colors.Sky};
  }

  &:disabled {
    background-color: ${({ theme }) => theme.colors.Black4};
    cursor: not-allowed;
  }
`;

const MvpNotice = styled.div`
  margin-top: 1.5rem;
  padding: 1rem;
  background-color: ${({ theme }) => theme.colors.Black3}80;
  border: 1px solid ${({ theme }) => theme.colors.Black4};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  
  p {
    ${({ theme }) => theme.fonts.Body3};
    color: ${({ theme }) => theme.colors.Gray4};
    text-align: center;
    margin: 0;
  }
`;

