import { useCallback, useState } from 'react';

export type FieldErrors = Record<string, string>;

/**
 * Copia editable de un formulario. Los errores de `validate` no se enseñan hasta el primer intento de guardar.
 * `changed` compara con el original por referencia: cualquier cambio crea un objeto nuevo.
 */
export function useFormDraft<T extends object>(initial: T, validate: (draft: T) => FieldErrors = () => ({})) {
    const [draft, setDraft] = useState(initial);
    const [attempted, setAttempted] = useState(false);
    const allErrors = validate(draft);
    const isValid = Object.keys(allErrors).length === 0;

    // Estable, para poder pasarla a secciones con memo.
    const update = useCallback((changes: Partial<T>) => setDraft((prev) => ({ ...prev, ...changes })), []);

    // Marca el intento (desde aquí se ven los errores) y, si no hay ninguno, guarda.
    const submit = (onValid: (draft: T) => void) => {
        setAttempted(true);
        if (isValid) onValid(draft);
    };

    return {
        draft,
        setDraft,
        update,
        changed: draft !== initial,
        errors: attempted ? allErrors : {},
        isValid,
        submit,
    };
}
