export const guidToCode = (guid: string): string => {
  // Pegar os primeiros 6 caracteres do GUID e converter para maiúsculas
  return guid.replace(/-/g, '').substring(0, 6).toUpperCase();
};

export const codeToGuid = (code: string): string | null => {
  // Na prática, vais precisar de manter uma lista em memória ou
  // fazer uma pesquisa na BD pelos primeiros 6 chars
  // Por agora, assumindo que o código É o sessionId completo
  return code;
};

export const generateSessionCode = (): string => {
  // Gerar um Guid novo para usar como sessionId
  return crypto.randomUUID();
};