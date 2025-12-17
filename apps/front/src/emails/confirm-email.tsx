import { Body, Container, Head, Html, Preview, Tailwind, Text } from '@react-email/components';
import React from 'react';
import enMessages from '../../translations/en.json';
import esMessages from '../../translations/es.json';

type Locale = 'en' | 'es';

function formatMessage(template: string, values: Record<string, string>) {
    return template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');
}

interface EmailProps {
    username?: string;
    locale?: Locale;
}

export const RegisterEmail = ({ username, locale = 'en' }: EmailProps) => {
    const messages = locale === 'es' ? esMessages : enMessages;
    const app = messages.App.title;

    const previewText = formatMessage(messages.Emails.confirm.preview, { app });

    return (
        <Html>
            <Head />
            <Preview>{previewText}</Preview>
            <Tailwind>
                <Body className="bg-white my-auto mx-auto font-sans px-2">
                    <Container className="border border-solid border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] max-w-[465px]">
                        <Text>
                            {formatMessage(messages.Emails.confirm.welcome, {
                                app,
                                username: username ?? '',
                            })}
                        </Text>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
};

RegisterEmail.PreviewProps = {
    username: 'test',
    locale: 'en',
} as EmailProps;

export default RegisterEmail;
