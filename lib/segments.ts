export const SEGMENTS = ["SaaS", "Indústria", "Serviços", "Varejo", "Saúde", "Educação", "Financeiro", "Automotivo e Veículos"] as const;

export const SUBSEGMENTS: Record<string, string[]> = {
  "SaaS":       ["CRM / Vendas", "Marketing / Growth", "RH / Pessoas", "Financeiro / Contab.", "ERP / Gestão", "Dados / Analytics", "Segurança / Compliance", "Produtividade"],
  "Indústria":  ["Manufatura", "Agroindústria", "Construção Civil", "Química / Petroquímica", "Metalurgia", "Alimentos e Bebidas", "Farmacêutica", "Têxtil / Confecção"],
  "Serviços":   ["Consultoria", "Tecnologia / TI", "Contabilidade / Jurídico", "Marketing / Publicidade", "Logística / Transporte", "Eventos", "Limpeza / Manutenção", "Saúde / Bem-estar"],
  "Varejo":     ["Moda / Vestuário", "Eletrônicos", "Alimentação", "Casa / Decoração", "Esportes", "Pet", "Farmácia / Drogaria", "Supermercado"],
  "Saúde":      ["Clínicas / Hospitais", "Planos de Saúde", "Laboratórios", "Telemedicina", "Odontologia", "Wellness / Prevenção", "MedTech", "Reabilitação"],
  "Educação":   ["EdTech", "Ensino Básico / Médio", "Ensino Superior", "Cursos Livres", "Treinamento Corporativo", "Idiomas", "Coaching / Mentoria", "Concursos / Vestibular"],
  "Financeiro": ["Fintechs", "Seguros", "Investimentos", "Crédito / Financiamento", "Bancos / Cooperativas", "Contabilidade", "Gestão Patrimonial", "Câmbio"],
  "Automotivo e Veículos": ["Concessionária / Veículos Novos", "Veículos Usados / Revenda", "Oficina Mecânica", "Funilaria e Pintura", "Autopeças e Acessórios", "Estética Automotiva", "Locação de Veículos", "Motos"],
};
