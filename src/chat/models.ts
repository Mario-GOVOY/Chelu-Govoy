// Las claves son las de MODELOS_DISPONIBLES del back (agentes/chat_CEX/agent.py); las descripciones, las de la web.
export const CHAT_MODELS = [
    { key: 'gpt-4o-mini', provider: 'OpenAI', description: 'Rápido y económico. Equilibrio ideal para el día a día.' },
    { key: 'gpt-4o', provider: 'OpenAI', description: 'Más capaz que 4o-mini para preguntas complejas.' },
    { key: 'gpt-4.1', provider: 'OpenAI', description: 'El más potente de OpenAI aquí; mejor razonamiento.' },
    { key: 'gpt-4.1-mini', provider: 'OpenAI', description: 'Versión ligera de 4.1, buen coste/calidad.' },
    { key: 'deepseek-chat', provider: 'DeepSeek', description: 'Modelo de DeepSeek, alternativa económica a OpenAI.' },
    { key: 'deepseek-v4-flash', provider: 'DeepSeek', description: 'DeepSeek en modo flash: respuestas muy rápidas.' },
];

// Como la web: el que usan todos los que no son master.
export const DEFAULT_CHAT_MODEL = 'deepseek-v4-flash';
