import { Pressable, ScrollView, Text } from 'react-native';

import { HojaInferior } from '@/components/ui/HojaInferior';

export type Question = { messageId: string; text: string };

// Hoja con las preguntas del usuario en la conversación, para saltar a una.
export function QuestionsSheet({ visible, questions, onJump, onClose }: {
    visible: boolean;
    questions: Question[];
    onJump: (messageId: string) => void;
    onClose: () => void;
}) {
    return (
        <HojaInferior visible={visible} titulo="Preguntas" onCerrar={onClose}>
            <ScrollView className="shrink" contentContainerClassName="gap-1 pb-2">
                {questions.map((question, index) => (
                    <Pressable
                        key={question.messageId}
                        onPress={() => onJump(question.messageId)}
                        accessibilityRole="button"
                        className="flex-row gap-3 rounded-xl bg-superficie px-4 py-3 active:bg-superficie-alt"
                    >
                        <Text className="w-6 text-right text-sm font-semibold text-texto-tenue">{index + 1}</Text>
                        <Text className="flex-1 text-sm text-texto" numberOfLines={2}>
                            {question.text}
                        </Text>
                    </Pressable>
                ))}
            </ScrollView>
        </HojaInferior>
    );
}
