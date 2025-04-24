import { Html, Preview, Tailwind, Container, Head, Body, Text } from '@react-email/components';
import React from 'react';

interface EmailProps {
  username?: string;
}

export const RegisterEmail = ({
  username,
}: EmailProps) => {
  const previewText = `Bienvenido a Metricas`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-white my-auto mx-auto font-sans px-2">
          <Container className="border border-solid border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] max-w-[465px]">
            <Text>login {username}</Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

RegisterEmail.PreviewProps = {
  username: 'test',
} as EmailProps;

export default RegisterEmail;
