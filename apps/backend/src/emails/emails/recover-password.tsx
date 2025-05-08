import {
    Html,
    Preview,
    Tailwind,
    Container,
    Head,
    Body,
    Text,
    Link,
  } from '@react-email/components';
  import React from 'react';
  
  interface EmailProps {
    username: string;
    link: string
  }
  
  export const RecoverPasswordEmail = ({ username, link }: EmailProps) => {
    const previewText = `Recuperar contraseña en Metricas`;
  
    return (
      <Html>
        <Head />
        <Preview>{previewText}</Preview>
        <Tailwind>
          <Body className="bg-white my-auto mx-auto font-sans px-2 text-center">
            <Container className="border border-solid border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] max-w-[465px]">
              <Text>Se ha solicitado un cambio de contraseña para el usuario {username}, para continuar haz click en el siguiente enlace</Text>
              <Link href={link}>Haz click aqui</Link>
            </Container>
          </Body>
        </Tailwind>
      </Html>
    );
  };
  
  RecoverPasswordEmail.PreviewProps = {
    username: 'test',
    link: 'http://localhost:3000/',
  } as EmailProps;
  
  export default RecoverPasswordEmail;
  