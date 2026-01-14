import type { FC } from "react";
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import ConfirmModal from "../components/ConfirmModal";
import { useAuthGuard } from "../hooks/useAuthGuard";

interface QuestionOption {
  id?: string;
  optionText: string;
  isCorrect: boolean;
  correctOrder?: number;
  markedForDeletion?: boolean; // Nova propriedade
}

interface Question {
  id: string;
  questionText: string;
  type: string;
  options: QuestionOption[];
  order?: number;
}

interface QuizDetails {
  id: string;
  title: string;
  description: string;
  authorId: string;
  createdAt: string;
  questionsCount: number;
}

interface EditingQuestion {
  id: string;
  questionText: string;
  typeId: string;
  options: Array<{
    id?: string;
    optionText: string;
    isCorrect: boolean;
    correctOrder?: number;
    markedForDeletion?: boolean; // Nova propriedade
  }>;
}

const VerQuiz: FC = () => {
  const navigate = useNavigate();
  useAuthGuard();
  const [searchParams] = useSearchParams();
  const quizId = searchParams.get("quizId");

  const [quiz, setQuiz] = useState<QuizDetails | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<EditingQuestion | null>(null);
  const [saving, setSaving] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [draggedQuestionId, setDraggedQuestionId] = useState<string | null>(null);
  const [dragOverQuestionId, setDragOverQuestionId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState<{
    questionText: string;
    typeId: string;
    options: Array<{
      optionText: string;
      isCorrect: boolean;
      correctOrder?: number;
    }>;
  }>({
    questionText: "",
    typeId: "1", // multiple_choice por padrão
    options: [
      { optionText: "", isCorrect: false },
      { optionText: "", isCorrect: false }
    ]
  });
  const [creating, setCreating] = useState(false);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'confirm' | 'alert' | 'error' | 'success';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'alert',
    onConfirm: () => {},
  });

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5027";

  const authFetch = (url: string, options: RequestInit = {}) => {
    const token = sessionStorage.getItem("brainup_token");
    console.log('[authFetch] Request:', { url, method: options.method || 'GET', hasToken: !!token });
    return fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });
  };

  useEffect(() => {
    console.log('[useEffect] Quiz ID:', quizId);
    if (!quizId) {
      console.error('[useEffect] Quiz ID não fornecido');
      setError("Quiz ID não fornecido");
      setLoading(false);
      return;
    }

    fetchQuizData();
  }, [quizId]);

  const fetchQuizData = async () => {
    try {
      console.log('[fetchQuizData] Iniciando carregamento de dados do quiz:', quizId);
      setLoading(true);

      const quizRes = await authFetch(`${apiBaseUrl}/api/Quizzes/${quizId}`);
      console.log('[fetchQuizData] Quiz response status:', quizRes.status);
      
      if (!quizRes.ok) {
        const errorText = await quizRes.text();
        console.error('[fetchQuizData] Erro ao carregar quiz:', { status: quizRes.status, error: errorText });
        throw new Error("Erro ao carregar quiz");
      }
      const quizData: QuizDetails = await quizRes.json();
      console.log('[fetchQuizData] Quiz carregado:', quizData);
      setQuiz(quizData);

      const questionsRes = await authFetch(
        `${apiBaseUrl}/api/Questions/quiz/${quizId}`
      );
      console.log('[fetchQuizData] Questions response status:', questionsRes.status);
      
      if (!questionsRes.ok) {
        const errorText = await questionsRes.text();
        console.warn('[fetchQuizData] Erro ao carregar perguntas:', { status: questionsRes.status, error: errorText });
        setQuestions([]);
        return;
      }
      const questionsData: Question[] = await questionsRes.json();
      
      // Ordenar as perguntas pelo campo 'order'
      const sortedQuestions = questionsData.sort((a, b) => {
        const orderA = a.order ?? 0;
        const orderB = b.order ?? 0;
        return orderA - orderB;
      });
      
      console.log('[fetchQuizData] Perguntas carregadas e ordenadas:', { count: sortedQuestions.length, questions: sortedQuestions });
      setQuestions(sortedQuestions);

    } catch (err) {
      console.error('[fetchQuizData] Erro crítico:', err);
      setError("Erro ao carregar dados do quiz. Tenta novamente.");
    } finally {
      setLoading(false);
      console.log('[fetchQuizData] Carregamento finalizado');
    }
  };

  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case "multiple_choice": return "Escolha Múltipla";
      case "true_false": return "Verdadeiro/Falso";
      case "ordering": return "Ordenação";
      default: return type;
    }
  };

  const showAlert = (title: string, message: string, type: 'alert' | 'error' | 'success' = 'alert') => {
    setModalState({
      isOpen: true,
      title,
      message,
      type,
      onConfirm: () => setModalState(prev => ({ ...prev, isOpen: false })),
    });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setModalState({
      isOpen: true,
      title,
      message,
      type: 'confirm',
      onConfirm: () => {
        setModalState(prev => ({ ...prev, isOpen: false }));
        onConfirm();
      },
    });
  };

  const handleEditClick = (question: Question) => {
    console.log('[handleEditClick] Editando pergunta:', question);
    setEditingQuestionId(question.id);
    const editData = {
      id: question.id,
      questionText: question.questionText,
      typeId: getTypeIdFromName(question.type),
      options: question.options.map(opt => ({
        id: opt.id,
        optionText: opt.optionText,
        isCorrect: opt.isCorrect,
        correctOrder: opt.correctOrder
      }))
    };
    console.log('[handleEditClick] Dados de edição:', editData);
    setEditingData(editData);
  };

  const handleCancelEdit = () => {
    console.log('[handleCancelEdit] Cancelando edição da pergunta:', editingQuestionId);
    setEditingQuestionId(null);
    setEditingData(null);
  };

  const handleSaveQuestion = async () => {
    if (!editingData) {
      console.warn('[handleSaveQuestion] Nenhum dado de edição disponível');
      return;
    }

    console.log('[handleSaveQuestion] Guardando pergunta:', editingData);

    try {
      setSaving(true);
      
      const updatePayload = {
        questionText: editingData.questionText,
        typeId: editingData.typeId,
      };
      console.log('[handleSaveQuestion] Payload de atualização da pergunta:', updatePayload);
      
      const response = await authFetch(`${apiBaseUrl}/api/Questions/${editingData.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatePayload)
      });

      console.log('[handleSaveQuestion] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[handleSaveQuestion] Erro ao atualizar pergunta:', { status: response.status, error: errorText });
        throw new Error("Erro ao atualizar pergunta");
      }

      const questionType = questions.find(q => q.id === editingData.id)?.type;
      console.log('[handleSaveQuestion] Tipo de pergunta:', questionType);

      // 1. Primeiro, apagar opções marcadas para deleção
      const optionsToDelete = editingData.options.filter(opt => opt.markedForDeletion && opt.id);
      console.log('[handleSaveQuestion] Opções para apagar:', optionsToDelete.length);
      
      for (const option of optionsToDelete) {
        console.log('[handleSaveQuestion] Apagando opção:', option.id);
        const deleteResponse = await authFetch(`${apiBaseUrl}/api/Questions/${editingData.id}/options/${option.id}`, {
          method: "DELETE"
        });

        if (!deleteResponse.ok) {
          const errorText = await deleteResponse.text();
          console.error('[handleSaveQuestion] Erro ao apagar opção:', { status: deleteResponse.status, error: errorText });
        } else {
          console.log('[handleSaveQuestion] Opção apagada com sucesso');
        }
      }

      // 2. Processar opções restantes (criar/atualizar)
      const activeOptions = editingData.options.filter(opt => !opt.markedForDeletion);
      console.log('[handleSaveQuestion] Processando opções ativas:', activeOptions.length);
      
      for (const [index, option] of activeOptions.entries()) {
        if (option.id) {
          // Atualizar opção existente
          const optionPayload = {
            optionText: option.optionText,
            isCorrect: questionType === "ordering" ? null : option.isCorrect,
            correctOrder: questionType === "ordering" ? option.correctOrder : null
          };
          console.log(`[handleSaveQuestion] Atualizando opção ${index + 1}:`, optionPayload);
          
          const optionResponse = await authFetch(`${apiBaseUrl}/api/Questions/${editingData.id}/options/${option.id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(optionPayload)
          });

          if (!optionResponse.ok) {
            const errorText = await optionResponse.text();
            console.error(`[handleSaveQuestion] Erro ao atualizar opção ${index + 1}:`, { status: optionResponse.status, error: errorText });
          } else {
            console.log(`[handleSaveQuestion] Opção ${index + 1} atualizada com sucesso`);
          }
        } else {
          // Criar nova opção
          const newOptionPayload = {
            optionText: option.optionText,
            isCorrect: questionType === "ordering" ? null : option.isCorrect,
            correctOrder: questionType === "ordering" ? option.correctOrder : null
          };
          console.log(`[handleSaveQuestion] Criando nova opção ${index + 1}:`, newOptionPayload);

          const createResponse = await authFetch(`${apiBaseUrl}/api/Questions/${editingData.id}/options`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(newOptionPayload)
          });

          if (!createResponse.ok) {
            const errorText = await createResponse.text();
            console.error(`[handleSaveQuestion] Erro ao criar opção ${index + 1}:`, { status: createResponse.status, error: errorText });
          } else {
            console.log(`[handleSaveQuestion] Opção ${index + 1} criada com sucesso`);
          }
        }
      }

      console.log('[handleSaveQuestion] Recarregando dados do quiz');
      await fetchQuizData();
      setEditingQuestionId(null);
      setEditingData(null);
      console.log('[handleSaveQuestion] Pergunta guardada com sucesso');
    } catch (err) {
      console.error('[handleSaveQuestion] Erro crítico:', err);
      showAlert('Erro', 'Erro ao guardar pergunta. Tenta novamente.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    console.log('[handleDeleteQuestion] Tentando apagar pergunta:', questionId);
    
    showConfirm(
      'Apagar Pergunta',
      'Tens a certeza que queres apagar esta pergunta?',
      async () => {
        try {
          console.log('[handleDeleteQuestion] Enviando pedido DELETE');
          const response = await authFetch(`${apiBaseUrl}/api/Questions/${questionId}`, {
            method: "DELETE"
          });

          console.log('[handleDeleteQuestion] Response status:', response.status);

          if (!response.ok) {
            const errorText = await response.text();
            console.error('[handleDeleteQuestion] Erro ao apagar pergunta:', { status: response.status, error: errorText });
            throw new Error("Erro ao apagar pergunta");
          }

          console.log('[handleDeleteQuestion] Pergunta apagada com sucesso');

          // Reordenar as perguntas restantes
          const remainingQuestions = questions.filter(q => q.id !== questionId);
          
          if (remainingQuestions.length > 0) {
            console.log('[handleDeleteQuestion] Reordenando perguntas restantes');
            
            const reorderPayload = {
              items: remainingQuestions.map((q, index) => ({
                questionId: q.id,
                order: index + 1
              }))
            };

            console.log('[handleDeleteQuestion] Payload de reordenação:', reorderPayload);

            const reorderResponse = await authFetch(`${apiBaseUrl}/api/Quizzes/${quizId}/questions/reorder`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(reorderPayload)
            });

            if (!reorderResponse.ok) {
              const errorText = await reorderResponse.text();
              console.error('[handleDeleteQuestion] Erro ao reordenar:', errorText);
              console.warn('[handleDeleteQuestion] Reordenação falhou, mas pergunta foi apagada');
            } else {
              console.log('[handleDeleteQuestion] Reordenação bem-sucedida');
            }
          }

          console.log('[handleDeleteQuestion] Recarregando dados do quiz');
          await fetchQuizData();
          
        } catch (err) {
          console.error('[handleDeleteQuestion] Erro crítico:', err);
          showAlert('Erro', 'Erro ao apagar pergunta. Tenta novamente.', 'error');
        }
      }
    );
  };

  const handleAddOption = () => {
    if (!editingData) {
      console.warn('[handleAddOption] Nenhum dado de edição disponível');
      return;
    }
    
    const questionType = questions.find(q => q.id === editingData.id)?.type;
    console.log('[handleAddOption] Tipo de pergunta:', questionType);
    
    if (questionType === "true_false") {
      console.warn('[handleAddOption] Tentativa de adicionar opção a pergunta Verdadeiro/Falso bloqueada');
      showAlert('Não Permitido', 'Não podes adicionar opções a perguntas Verdadeiro/Falso', 'alert');
      return;
    }

    // Adicionar opção temporariamente ao estado (sem ID = nova opção)
    const newOption = {
      optionText: "Nova opção",
      isCorrect: false,
      ...(questionType === "ordering" && { correctOrder: editingData.options.length + 1 })
    };

    console.log('[handleAddOption] Adicionando opção temporária:', newOption);

    setEditingData({
      ...editingData,
      options: [...editingData.options, newOption]
    });
  };

    const handleRemoveOption = (optionId: string | undefined, index: number) => {
      if (!editingData) return;
    
      const questionType = questions.find(q => q.id === editingData.id)?.type;
    
      if (questionType === "true_false") {
        showAlert(
          'Não Permitido',
          'Não podes remover opções de perguntas Verdadeiro/Falso',
          'alert'
        );
        return;
      }
    
      const newOptions = [...editingData.options];
      const option = newOptions[index];
    
      // 🔄 SE JÁ ESTÁ MARCADA → RESTAURAR
      if (option.markedForDeletion) {
        newOptions[index] = {
          ...option,
          markedForDeletion: false
        };
    
        setEditingData({ ...editingData, options: newOptions });
        return;
      }
    
      // Contar opções ativas
      const activeOptions = newOptions.filter(opt => !opt.markedForDeletion);
      if (activeOptions.length <= 2) {
        showAlert(
          'Mínimo de Opções',
          'Uma pergunta deve ter pelo menos 2 opções',
          'alert'
        );
        return;
      }
    
      // ❌ NOVA OPÇÃO (sem ID) → remover do array
      if (!optionId) {
        newOptions.splice(index, 1);
        setEditingData({ ...editingData, options: newOptions });
        return;
      }
    
      // ❌ EXISTENTE → marcar para deleção
      newOptions[index] = {
        ...option,
        markedForDeletion: true
      };
    
      setEditingData({ ...editingData, options: newOptions });
    };  

  const handleOptionChange = (index: number, field: string, value: any) => {
    console.log('[handleOptionChange] Alterando opção:', { index, field, value });
    
    if (!editingData) {
      console.warn('[handleOptionChange] Nenhum dado de edição disponível');
      return;
    }
    
    const newOptions = [...editingData.options];
    
    const questionType = questions.find(q => q.id === editingData.id)?.type;
    if (field === "isCorrect" && value === true && questionType !== "ordering") {
      console.log('[handleOptionChange] Desmarcando outras opções corretas');
      newOptions.forEach((opt, i) => {
        if (i !== index) {
          opt.isCorrect = false;
        }
      });
    }
    
    newOptions[index] = { ...newOptions[index], [field]: value };
    console.log('[handleOptionChange] Novas opções:', newOptions);
    setEditingData({ ...editingData, options: newOptions });
  };

  const getTypeIdFromName = (typeName: string): string => {
    const typeMap: Record<string, string> = {
      "multiple_choice": "1",
      "true_false": "2",
      "ordering": "3"
    };
    const typeId = typeMap[typeName] || "1";
    console.log('[getTypeIdFromName] Conversão:', { typeName, typeId });
    return typeId;
  };

  const handleDragStart = (e: React.DragEvent, questionId: string) => {
    console.log('[handleDragStart] Iniciando arrasto:', questionId);
    setDraggedQuestionId(questionId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, questionId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedQuestionId && draggedQuestionId !== questionId) {
      setDragOverQuestionId(questionId);
    }
  };

  const handleDragLeave = () => {
    setDragOverQuestionId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetQuestionId: string) => {
    e.preventDefault();
    console.log('[handleDrop] Largando pergunta:', { draggedQuestionId, targetQuestionId });
    
    if (!draggedQuestionId || draggedQuestionId === targetQuestionId) {
      setDraggedQuestionId(null);
      setDragOverQuestionId(null);
      return;
    }

    const draggedIndex = questions.findIndex(q => q.id === draggedQuestionId);
    const targetIndex = questions.findIndex(q => q.id === targetQuestionId);

    if (draggedIndex === -1 || targetIndex === -1) {
      console.warn('[handleDrop] Índices inválidos');
      setDraggedQuestionId(null);
      setDragOverQuestionId(null);
      return;
    }

    const newQuestions = [...questions];
    const [draggedQuestion] = newQuestions.splice(draggedIndex, 1);
    newQuestions.splice(targetIndex, 0, draggedQuestion);

    const reorderPayload = {
      items: newQuestions.map((q, index) => ({
        questionId: q.id,
        order: index + 1
      }))
    };

    console.log('[handleDrop] Payload de reordenação:', reorderPayload);

    try {
      setReordering(true);
      
      const response = await authFetch(`${apiBaseUrl}/api/Quizzes/${quizId}/questions/reorder`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reorderPayload)
      });

      console.log('[handleDrop] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[handleDrop] Erro ao reordenar:', { 
          status: response.status, 
          error: errorText,
          payload: reorderPayload 
        });
        throw new Error(`Erro ao reordenar perguntas: ${response.status} - ${errorText}`);
      }

      console.log('[handleDrop] Reordenação bem-sucedida, atualizando estado');
      setQuestions(newQuestions);
      
    } catch (err) {
      console.error('[handleDrop] Erro crítico:', err);
      showAlert('Erro', err instanceof Error ? err.message : 'Erro ao reordenar perguntas. Tenta novamente.', 'error');
      await fetchQuizData();
    } finally {
      setReordering(false);
      setDraggedQuestionId(null);
      setDragOverQuestionId(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedQuestionId(null);
    setDragOverQuestionId(null);
  };

  const handleAddNewQuestion = () => {
    setShowAddModal(true);
    setNewQuestion({
      questionText: "",
      typeId: "1",
      options: [
        { optionText: "", isCorrect: false },
        { optionText: "", isCorrect: false }
      ]
    });
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setNewQuestion({
      questionText: "",
      typeId: "1",
      options: [
        { optionText: "", isCorrect: false },
        { optionText: "", isCorrect: false }
      ]
    });
  };

  const handleTypeChange = (typeId: string) => {
    if (typeId === "2") { // true_false
      setNewQuestion({
        ...newQuestion,
        typeId,
        options: [
          { optionText: "Verdadeiro", isCorrect: false },
          { optionText: "Falso", isCorrect: false }
        ]
      });
    } else if (typeId === "3") { // ordering
      setNewQuestion({
        ...newQuestion,
        typeId,
        options: [
          { optionText: "", isCorrect: false, correctOrder: 1 },
          { optionText: "", isCorrect: false, correctOrder: 2 }
        ]
      });
    } else { // multiple_choice
      setNewQuestion({
        ...newQuestion,
        typeId,
        options: [
          { optionText: "", isCorrect: false },
          { optionText: "", isCorrect: false }
        ]
      });
    }
  };

  const handleAddOptionToNew = () => {
    const isOrdering = newQuestion.typeId === "3";
    const newOption = {
      optionText: "",
      isCorrect: false,
      ...(isOrdering && { correctOrder: newQuestion.options.length + 1 })
    };
    setNewQuestion({
      ...newQuestion,
      options: [...newQuestion.options, newOption]
    });
  };

  const handleRemoveOptionFromNew = (index: number) => {
    if (newQuestion.options.length <= 2) {
      showAlert('Mínimo de Opções', 'Deve ter pelo menos 2 opções', 'alert');
      return;
    }
    const newOptions = newQuestion.options.filter((_, i) => i !== index);
    setNewQuestion({
      ...newQuestion,
      options: newOptions
    });
  };

  const handleNewOptionChange = (index: number, field: string, value: any) => {
    const newOptions = [...newQuestion.options];
    
    // Para multiple choice e true_false, apenas uma opção pode ser correta
    if (field === "isCorrect" && value === true && (newQuestion.typeId === "1" || newQuestion.typeId === "2")) {
      newOptions.forEach((opt, i) => {
        if (i !== index) {
          opt.isCorrect = false;
        }
      });
    }
    
    newOptions[index] = { ...newOptions[index], [field]: value };
    setNewQuestion({
      ...newQuestion,
      options: newOptions
    });
  };

  const handleCreateQuestion = async () => {
    // Validações
    if (!newQuestion.questionText.trim()) {
      showAlert('Campo Obrigatório', 'O texto da pergunta é obrigatório', 'alert');
      return;
    }

    const validOptions = newQuestion.options.filter(opt => opt.optionText.trim() !== "");
    if (validOptions.length < 2) {
      showAlert('Opções Insuficientes', 'A pergunta deve ter pelo menos 2 opções válidas', 'alert');
      return;
    }

    // Para multiple_choice e true_false, pelo menos uma deve ser correta
    if (newQuestion.typeId !== "3" && !validOptions.some(opt => opt.isCorrect)) {
      showAlert('Resposta Correta', 'Pelo menos uma opção deve ser marcada como correta', 'alert');
      return;
    }

    // Para ordering, verificar se todas têm correctOrder
    if (newQuestion.typeId === "3") {
      const hasInvalidOrder = validOptions.some(opt => !opt.correctOrder);
      if (hasInvalidOrder) {
        showAlert('Ordem Inválida', 'Todas as opções de ordenação devem ter uma ordem definida', 'alert');
        return;
      }
    }

    try {
      setCreating(true);

      // 1. Criar a pergunta
      const questionPayload = {
        questionText: newQuestion.questionText,
        typeId: parseInt(newQuestion.typeId),
        options: validOptions.map(opt => ({
          optionText: opt.optionText,
          isCorrect: newQuestion.typeId === "3" ? null : opt.isCorrect,
          correctOrder: newQuestion.typeId === "3" ? opt.correctOrder : null
        }))
      };

      console.log('[handleCreateQuestion] Payload da pergunta:', questionPayload);

      const createResponse = await authFetch(`${apiBaseUrl}/api/Questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(questionPayload)
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error('[handleCreateQuestion] Erro ao criar pergunta:', errorText);
        throw new Error("Erro ao criar pergunta");
      }

      const createdQuestion = await createResponse.json();
      console.log('[handleCreateQuestion] Pergunta criada:', createdQuestion);

      // 2. Adicionar a pergunta ao quiz
      const nextOrder = questions.length + 1;
      const addToQuizPayload = {
        questionId: createdQuestion.id,
        order: nextOrder
      };

      console.log('[handleCreateQuestion] Adicionando ao quiz:', addToQuizPayload);

      const addResponse = await authFetch(`${apiBaseUrl}/api/Quizzes/${quizId}/questions/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(addToQuizPayload)
      });

      if (!addResponse.ok) {
        const errorText = await addResponse.text();
        console.error('[handleCreateQuestion] Erro ao adicionar ao quiz:', errorText);
        throw new Error("Erro ao adicionar pergunta ao quiz");
      }

      console.log('[handleCreateQuestion] Pergunta adicionada ao quiz com sucesso');

      // 3. Recarregar dados
      await fetchQuizData();
      handleCloseAddModal();

    } catch (err) {
      console.error('[handleCreateQuestion] Erro crítico:', err);
      showAlert('Erro', err instanceof Error ? err.message : 'Erro ao criar pergunta', 'error');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    console.log('[Render] Estado: loading');
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-700 via-indigo-700 to-pink-700 flex items-center justify-center">
        <div className="text-white text-xl">A carregar quiz...</div>
      </div>
    );
  }

  if (error || !quiz) {
    console.log('[Render] Estado: error ou quiz não encontrado', { error, hasQuiz: !!quiz });
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-700 via-indigo-700 to-pink-700 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-4">{error || "Quiz não encontrado"}</div>
          <button
            onClick={() => navigate("/dashboard")}
            className="rounded-xl bg-white/20 px-6 py-3 text-white transition hover:bg-white/30"
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

  console.log('[Render] Estado: normal', { questionsCount: questions.length, editing: editingQuestionId });

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-gradient-to-br from-purple-800 via-indigo-800 to-pink-800 text-white">
      <div className="flex min-h-screen w-full flex-col gap-8 px-4 py-12 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Header */}
        <header className="rounded-3xl border border-white/30 bg-gradient-to-br from-white/15 to-white/5 p-8 backdrop-blur-xl shadow-2xl transition-all duration-300 hover:shadow-purple-500/20">
          <button
            onClick={() => navigate("/dashboard")}
            className="mb-6 flex items-center gap-2 text-white/70 transition-all duration-300 hover:text-white hover:translate-x-1 group"
          >
            <svg className="h-5 w-5 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-semibold">Voltar ao Dashboard</span>
          </button>

          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-purple-200/70 font-bold">
              Visualizar e editar
            </p>
            <h1 className="mt-3 text-3xl font-black sm:text-4xl bg-gradient-to-r from-white to-purple-100 bg-clip-text text-transparent">
              {quiz.title}
            </h1>
            {quiz.description && (
              <p className="mt-3 text-base text-white/80 sm:text-lg leading-relaxed">{quiz.description}</p>
            )}
            <div className="mt-6 flex flex-wrap gap-4 text-sm items-center justify-between">
              <div className="flex flex-wrap gap-4">
                <div className="rounded-2xl border border-purple-300/40 bg-gradient-to-br from-purple-400/20 to-purple-600/10 px-5 py-2.5 backdrop-blur-sm shadow-lg">
                  <span className="font-bold text-lg">{questions.length}</span>{" "}
                  <span className="text-purple-100">{questions.length === 1 ? "pergunta" : "perguntas"}</span>
                </div>
                <div className="rounded-2xl border border-indigo-300/40 bg-gradient-to-br from-indigo-400/20 to-indigo-600/10 px-5 py-2.5 backdrop-blur-sm shadow-lg">
                  <span className="text-indigo-100">Criado em {new Date(quiz.createdAt).toLocaleDateString("pt-PT")}</span>
                </div>
              </div>
              <button
                onClick={handleAddNewQuestion}
                className="rounded-2xl border border-emerald-300/50 bg-gradient-to-r from-emerald-400/30 to-emerald-600/30 px-6 py-3 text-sm font-bold text-emerald-50 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-emerald-500/30 flex items-center gap-2"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nova Pergunta
              </button>
            </div>
          </div>
        </header>

        {/* Questions List */}
        <main className="space-y-8">
          {questions.length === 0 ? (
            <div className="rounded-3xl border border-white/30 bg-gradient-to-br from-white/10 to-white/5 p-16 backdrop-blur-xl shadow-2xl text-center">
              <div className="inline-flex p-6 rounded-full bg-gradient-to-br from-purple-400/30 to-pink-400/30 mb-6">
                <svg className="h-20 w-20 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-xl font-bold text-white/90 mb-2">Este quiz ainda não tem perguntas.</p>
              <p className="text-base text-white/60">Adiciona perguntas para começar!</p>
            </div>
          ) : (
            questions.map((question, index) => (
              <section
                key={question.id}
                draggable={editingQuestionId !== question.id && !reordering}
                onDragStart={(e) => handleDragStart(e, question.id)}
                onDragOver={(e) => handleDragOver(e, question.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, question.id)}
                onDragEnd={handleDragEnd}
                className={`rounded-3xl border backdrop-blur-xl shadow-2xl overflow-hidden transition-all duration-300 ${
                  draggedQuestionId === question.id
                    ? 'opacity-50 scale-95 border-yellow-400/50 bg-gradient-to-br from-yellow-400/20 to-orange-400/10'
                    : dragOverQuestionId === question.id
                    ? 'border-emerald-400/70 bg-gradient-to-br from-emerald-400/25 to-emerald-600/15 scale-105 shadow-emerald-500/30'
                    : 'border-white/30 bg-gradient-to-br from-white/15 to-white/5 hover:shadow-purple-500/20 hover:scale-[1.01]'
                } ${editingQuestionId === question.id ? 'cursor-default' : 'cursor-move'}`}
              >
                {editingQuestionId === question.id && editingData ? (
                  // Edit Mode
                  <div className="p-8">
                    <div className="flex items-center justify-between gap-4 mb-6">
                      <div className="flex items-center gap-4">
                        <div className="rounded-2xl border border-purple-300/40 bg-gradient-to-br from-purple-400/30 to-purple-600/20 px-4 py-2 text-sm font-bold shadow-lg">
                          Pergunta {index + 1}
                        </div>
                        <div className="rounded-2xl border border-blue-300/50 bg-gradient-to-r from-blue-400/30 to-cyan-400/30 px-4 py-2 text-xs font-bold text-blue-50 shadow-lg animate-pulse flex items-center gap-2">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          MODO DE EDIÇÃO
                        </div>
                      </div>
                    </div>

                    {error && (
                      <div className="mb-6 rounded-2xl border border-red-300/50 bg-gradient-to-r from-red-400/20 to-red-600/20 px-5 py-4 text-sm text-red-50 shadow-lg">
                        {error}
                      </div>
                    )}

                    <div className="space-y-6">
                      <div className="space-y-3">
                        <label className="text-sm font-bold text-white/90 uppercase tracking-wide">
                          Texto da pergunta
                        </label>
                        <textarea
                          value={editingData.questionText}
                          onChange={(e) => setEditingData({ ...editingData, questionText: e.target.value })}
                          rows={3}
                          className="w-full rounded-2xl bg-white/25 border-2 border-white/30 px-5 py-4 text-white placeholder-white/60 focus:outline-none focus:ring-4 focus:ring-yellow-300/50 focus:border-yellow-300/50 transition-all duration-300 shadow-inner"
                          placeholder="Escreve a pergunta principal"
                        />
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-bold text-white/90 uppercase tracking-wide">
                            Opções de resposta
                          </label>
                          {question.type !== "true_false" && (
                            <button
                              onClick={handleAddOption}
                              className="rounded-2xl border border-emerald-300/50 bg-gradient-to-r from-emerald-400/30 to-emerald-600/30 px-5 py-2.5 text-sm font-bold text-emerald-50 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-emerald-500/30 flex items-center gap-2"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              Adicionar opção
                            </button>
                          )}
                        </div>

                        <div className="space-y-3">
                          {editingData.options.map((option, optIndex) => (
                            <div
                              key={option.id || optIndex}
                              className={`flex flex-wrap items-center gap-3 rounded-2xl border px-5 py-4 shadow-lg transition-all duration-300 ${
                                option.markedForDeletion
                                  ? 'border-red-300/50 bg-gradient-to-r from-red-900/30 to-red-800/20 opacity-60'
                                  : 'border-white/20 bg-gradient-to-r from-white/10 to-white/5 hover:bg-white/15'
                              }`}
                            >
                              {question.type === "ordering" ? (
                                <>
                                  <input
                                    type="number"
                                    min={1}
                                    value={option.correctOrder || optIndex + 1}
                                    onChange={(e) => handleOptionChange(optIndex, "correctOrder", parseInt(e.target.value))}
                                    className="w-20 rounded-xl bg-white/25 border-2 border-white/30 px-3 py-2 text-white text-center font-bold focus:outline-none focus:ring-2 focus:ring-yellow-300/50 transition-all duration-300 disabled:opacity-50"
                                    disabled={option.markedForDeletion}
                                  />
                                  <input
                                    type="text"
                                    value={option.optionText}
                                    onChange={(e) => handleOptionChange(optIndex, "optionText", e.target.value)}
                                    className="flex-1 rounded-xl bg-white/25 border-2 border-white/30 px-4 py-2 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-yellow-300/50 transition-all duration-300 disabled:opacity-50 disabled:line-through"
                                    placeholder={`Item ${optIndex + 1}`}
                                    disabled={option.markedForDeletion}
                                  />
                                </>
                              ) : (
                                <>
                                  <input
                                    type="radio"
                                    name={`correct-${question.id}`}
                                    checked={option.isCorrect}
                                    onChange={(e) => handleOptionChange(optIndex, "isCorrect", e.target.checked)}
                                    className="h-5 w-5 cursor-pointer accent-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={option.markedForDeletion}
                                  />
                                  <input
                                    type="text"
                                    value={option.optionText}
                                    onChange={(e) => handleOptionChange(optIndex, "optionText", e.target.value)}
                                    className="flex-1 rounded-xl bg-white/25 border-2 border-white/30 px-4 py-2 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-yellow-300/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:line-through"
                                    placeholder={`Opção ${optIndex + 1}`}
                                    disabled={question.type === "true_false" || option.markedForDeletion}
                                  />
                                </>
                              )}
                              {question.type !== "true_false" && (
                                option.markedForDeletion ? (
                                  // Sempre mostrar botão Restaurar se marcado para deleção
                                  <button
                                    onClick={() => handleRemoveOption(option.id, optIndex)}
                                    className="rounded-xl border border-emerald-300/50 bg-gradient-to-r from-emerald-400/30 to-emerald-600/30 text-emerald-50 px-4 py-2 text-sm font-bold transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-emerald-500/30 flex items-center gap-2 opacity-100"
                                    title="Cancelar remoção"
                                  >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    Restaurar
                                  </button>
                                ) : (
                                  // Mostrar botão Remover se houver mais de 2 opções ativas
                                  editingData.options.filter(opt => !opt.markedForDeletion).length > 2 && (
                                    <button
                                      onClick={() => handleRemoveOption(option.id, optIndex)}
                                      className="rounded-xl border border-red-300/50 bg-gradient-to-r from-red-400/30 to-red-600/30 text-red-50 px-4 py-2 text-sm font-bold transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-red-500/30 flex items-center gap-2"
                                      title="Marcar para remover"
                                    >
                                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                      Remover
                                    </button>
                                  )
                                )
                              )}
                            </div>
                          ))}
                        </div>

                        {question.type === "true_false" && (
                          <p className="text-xs text-white/70 italic bg-white/5 rounded-xl px-4 py-2 border border-white/20 flex items-center gap-2">
                            <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            As opções de perguntas Verdadeiro/Falso têm texto fixo. Seleciona a resposta correta clicando no círculo.
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end pt-4 border-t border-white/20">
                        <button
                          onClick={handleCancelEdit}
                          className="rounded-2xl border-2 border-white/40 px-8 py-3 text-sm font-bold transition-all duration-300 hover:bg-white/15 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={saving}
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleSaveQuestion}
                          className="rounded-2xl bg-gradient-to-r from-yellow-400 via-orange-400 to-orange-500 px-8 py-3 text-sm font-bold text-white shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-orange-500/50 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100 flex items-center justify-center gap-2"
                          disabled={saving}
                        >
                          {saving ? (
                            <>
                              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              A guardar...
                            </>
                          ) : (
                            <>
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                              </svg>
                              Guardar alterações
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div className="p-8">
                    <div className="flex items-start justify-between gap-4 mb-6">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="flex flex-col gap-2">
                          <div className="rounded-2xl border border-purple-300/40 bg-gradient-to-br from-purple-400/30 to-purple-600/20 px-4 py-2 text-base font-black shadow-lg min-w-[3rem] text-center flex items-center justify-center gap-2">
                            <svg className="h-4 w-4 text-purple-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                            </svg>
                            {index + 1}
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <span className="text-xs rounded-xl border border-indigo-300/50 bg-gradient-to-r from-indigo-400/30 to-indigo-600/20 px-4 py-1.5 font-bold text-indigo-50 shadow-md">
                              {getQuestionTypeLabel(question.type)}
                            </span>
                          </div>
                          <h3 className="text-lg font-bold sm:text-xl text-white leading-relaxed">{question.questionText}</h3>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => handleEditClick(question)}
                          className="rounded-2xl border-2 border-white/40 px-5 py-2.5 text-sm font-bold transition-all duration-300 hover:bg-white/15 hover:scale-105 hover:shadow-lg flex items-center gap-2"
                          title="Editar"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(question.id)}
                          className="rounded-2xl border border-red-300/50 bg-gradient-to-r from-red-400/30 to-red-600/30 px-5 py-2.5 text-sm font-bold text-red-50 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-red-500/30 flex items-center gap-2"
                          title="Apagar"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Apagar
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3 pl-0 sm:pl-16">
                      {question.options.map((option, _optIndex) => (
                        <div
                          key={option.id}
                          className={`rounded-2xl border px-5 py-4 text-sm transition-all duration-300 hover:scale-[1.02] shadow-md ${
                            option.isCorrect || question.type === "ordering"
                              ? "border-emerald-300/50 bg-gradient-to-r from-emerald-400/25 to-emerald-600/20 text-emerald-50 shadow-emerald-500/20"
                              : "border-white/20 bg-gradient-to-r from-white/10 to-white/5 text-white/90"
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            {question.type === "ordering" && option.correctOrder !== undefined ? (
                              <>
                                <span className="rounded-xl border border-emerald-300/50 bg-gradient-to-br from-emerald-400/40 to-emerald-600/30 px-3 py-1.5 text-sm font-black shadow-md">
                                  {option.correctOrder}
                                </span>
                                <span className="flex-1 font-medium">{option.optionText}</span>
                              </>
                            ) : (
                              <>
                                {option.isCorrect && (
                                  <div className="flex-shrink-0 p-1 rounded-lg bg-emerald-400/30">
                                    <svg className="h-5 w-5 text-emerald-200" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                )}
                                <span className="flex-1 font-medium">{option.optionText}</span>
                                {option.isCorrect && (
                                  <span className="text-xs font-bold bg-emerald-400/30 px-3 py-1 rounded-full flex items-center gap-1">
                                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                    Correta
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            ))
          )}
        </main>
      </div>

      {/* Modal Adicionar Pergunta */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-purple-900/95 to-indigo-900/95 rounded-3xl border border-white/30 p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-white">Adicionar Nova Pergunta</h2>
              <button
                onClick={handleCloseAddModal}
                className="rounded-xl p-2 hover:bg-white/10 transition-all"
                disabled={creating}
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* Tipo de Pergunta */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-white/90 uppercase tracking-wide">
                  Tipo de Pergunta
                </label>
                <select
                  value={newQuestion.typeId}
                  onChange={(e) => handleTypeChange(e.target.value)}
                  className="w-full rounded-2xl bg-white/25 border-2 border-white/30 px-5 py-4 text-white focus:outline-none focus:ring-4 focus:ring-yellow-300/50 transition-all"
                  disabled={creating}
                >
                  <option value="1" className="bg-purple-900">Escolha Múltipla</option>
                  <option value="2" className="bg-purple-900">Verdadeiro/Falso</option>
                  <option value="3" className="bg-purple-900">Ordenação</option>
                </select>
              </div>

              {/* Texto da Pergunta */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-white/90 uppercase tracking-wide">
                  Texto da Pergunta
                </label>
                <textarea
                  value={newQuestion.questionText}
                  onChange={(e) => setNewQuestion({ ...newQuestion, questionText: e.target.value })}
                  rows={3}
                  className="w-full rounded-2xl bg-white/25 border-2 border-white/30 px-5 py-4 text-white placeholder-white/60 focus:outline-none focus:ring-4 focus:ring-yellow-300/50 transition-all"
                  placeholder="Escreve o texto da pergunta..."
                  disabled={creating}
                />
              </div>

              {/* Opções */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-white/90 uppercase tracking-wide">
                    Opções de Resposta
                  </label>
                  {newQuestion.typeId !== "2" && (
                    <button
                      onClick={handleAddOptionToNew}
                      className="rounded-xl border border-emerald-300/50 bg-emerald-400/20 px-4 py-2 text-sm font-bold text-emerald-50 hover:bg-emerald-400/30 transition-all flex items-center gap-2"
                      disabled={creating}
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Adicionar
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {newQuestion.options.map((option, index) => (
                    <div key={index} className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-5 py-4">
                      {newQuestion.typeId === "3" ? (
                        // Ordenação
                        <>
                          <input
                            type="number"
                            min={1}
                            value={option.correctOrder || index + 1}
                            onChange={(e) => handleNewOptionChange(index, "correctOrder", parseInt(e.target.value))}
                            className="w-20 rounded-xl bg-white/25 border-2 border-white/30 px-3 py-2 text-white text-center font-bold focus:outline-none focus:ring-2 focus:ring-yellow-300/50"
                            disabled={creating}
                          />
                          <input
                            type="text"
                            value={option.optionText}
                            onChange={(e) => handleNewOptionChange(index, "optionText", e.target.value)}
                            className="flex-1 rounded-xl bg-white/25 border-2 border-white/30 px-4 py-2 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-yellow-300/50"
                            placeholder={`Item ${index + 1}`}
                            disabled={creating}
                          />
                        </>
                      ) : (
                        // Multiple Choice ou True/False
                        <>
                          <input
                            type="radio"
                            name="correct-option"
                            checked={option.isCorrect}
                            onChange={(e) => handleNewOptionChange(index, "isCorrect", e.target.checked)}
                            className="h-5 w-5 cursor-pointer accent-yellow-400"
                            disabled={creating}
                          />
                          <input
                            type="text"
                            value={option.optionText}
                            onChange={(e) => handleNewOptionChange(index, "optionText", e.target.value)}
                            className="flex-1 rounded-xl bg-white/25 border-2 border-white/30 px-4 py-2 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-yellow-300/50 disabled:opacity-60 disabled:cursor-not-allowed"
                            placeholder={`Opção ${index + 1}`}
                            disabled={creating || newQuestion.typeId === "2"}
                          />
                        </>
                      )}
                      {newQuestion.typeId !== "2" && newQuestion.options.length > 2 && (
                        <button
                          onClick={() => handleRemoveOptionFromNew(index)}
                          className="rounded-xl border border-red-300/50 bg-red-400/20 px-3 py-2 text-red-50 hover:bg-red-400/30 transition-all"
                          disabled={creating}
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {newQuestion.typeId === "2" && (
                  <p className="text-xs text-white/70 italic bg-white/5 rounded-xl px-4 py-2 border border-white/20 flex items-center gap-2">
                    <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    Perguntas Verdadeiro/Falso têm opções fixas. Seleciona a resposta correta clicando no círculo.
                  </p>
                )}
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-4 border-t border-white/20">
                <button
                  onClick={handleCloseAddModal}
                  className="flex-1 rounded-2xl border-2 border-white/40 px-6 py-3 font-bold hover:bg-white/10 transition-all"
                  disabled={creating}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateQuestion}
                  className="flex-1 rounded-2xl bg-gradient-to-r from-yellow-400 via-orange-400 to-orange-500 px-6 py-3 font-bold text-white shadow-xl hover:scale-105 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                  disabled={creating}
                >
                  {creating ? (
                    <>
                      <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Criando...
                    </>
                  ) : (
                    <>
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Criar Pergunta
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação/Alerta */}
      <ConfirmModal
        isOpen={modalState.isOpen}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
        confirmText="OK"
        cancelText="Cancelar"
        onConfirm={modalState.onConfirm}
        onCancel={() => setModalState(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default VerQuiz;