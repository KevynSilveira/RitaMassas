import FontAwesome from '@expo/vector-icons/FontAwesome';
import type { Href } from 'expo-router';
import type { ComponentProps } from 'react';

type NavIcon = ComponentProps<typeof FontAwesome>['name'];

export type NavigationShortcut = {
  key: string;
  title: string;
  subtitle: string;
  href: Href;
  icon: NavIcon;
  keywords?: string[];
};

export type NavigationSection = {
  title: string;
  description: string;
  items: NavigationShortcut[];
};

const operationItems: NavigationShortcut[] = [
  {
    key: 'index',
    title: 'Inicio',
    subtitle: 'Resumo rapido do dia, proximas entregas e alertas',
    href: '/',
    icon: 'home',
    keywords: ['home', 'dashboard', 'painel'],
  },
  {
    key: 'busca',
    title: 'Busca',
    subtitle: 'Procurar atalhos, pedidos, clientes e produtos',
    href: '/busca' as Href,
    icon: 'search',
    keywords: ['pesquisa', 'procurar', 'atalhos', 'global'],
  },
  {
    key: 'pedidos',
    title: 'Pedidos',
    subtitle: 'Acompanhar etapas, atrasos e fila de producao',
    href: '/pedidos',
    icon: 'list-alt',
    keywords: ['gestao', 'pedido', 'fila'],
  },
  {
    key: 'novo-pedido',
    title: 'Novo pedido',
    subtitle: 'Criar um novo pedido com cliente, itens e entrega',
    href: '/pedido/novo',
    icon: 'plus-circle',
    keywords: ['criar pedido', 'cadastro pedido'],
  },
  {
    key: 'agenda',
    title: 'Agenda',
    subtitle: 'Visualizar entregas por mes e por dia',
    href: '/agenda',
    icon: 'calendar',
    keywords: ['calendario', 'entregas'],
  },
];

const analysisItems: NavigationShortcut[] = [
  {
    key: 'relatorios',
    title: 'Relatorios',
    subtitle: 'Visao geral, exportacao e analise do negocio',
    href: '/relatorios',
    icon: 'bar-chart',
    keywords: ['indicadores', 'dashboard'],
  },
];

const registerItems: NavigationShortcut[] = [
  {
    key: 'clientes',
    title: 'Clientes',
    subtitle: 'Cadastrar, consultar e editar clientes',
    href: '/clientes',
    icon: 'users',
    keywords: ['cadastro cliente'],
  },
  {
    key: 'produtos',
    title: 'Massas e produtos',
    subtitle: 'Gerenciar catalogo, fotos, receitas e valores',
    href: '/produtos',
    icon: 'shopping-basket',
    keywords: ['massas', 'catalogo', 'produtos'],
  },
];

const reportShortcutItems: NavigationShortcut[] = [
  {
    key: 'relatorios-pedidos',
    title: 'Relatorio de pedidos',
    subtitle: 'Pedidos por periodo, status e exportacao',
    href: '/relatorios/pedidos',
    icon: 'file-text-o',
    keywords: ['pedidos', 'relatorio pedidos'],
  },
  {
    key: 'relatorios-clientes',
    title: 'Relatorio de clientes',
    subtitle: 'Clientes ativos, recorrencia e exportacao',
    href: '/relatorios/clientes',
    icon: 'address-book-o',
    keywords: ['clientes', 'relatorio clientes'],
  },
  {
    key: 'relatorios-produtos',
    title: 'Relatorio de produtos',
    subtitle: 'Produtos mais vendidos e desempenho',
    href: '/relatorios/produtos',
    icon: 'cutlery',
    keywords: ['produtos', 'massas', 'relatorio produtos'],
  },
  {
    key: 'relatorios-financeiro',
    title: 'Relatorio financeiro',
    subtitle: 'Faturamento, status e consolidado do periodo',
    href: '/relatorios/financeiro',
    icon: 'line-chart',
    keywords: ['financeiro', 'faturamento', 'receita'],
  },
];

export const SIDEBAR_SECTIONS: NavigationSection[] = [
  {
    title: 'Operacao',
    description: 'Atalhos do dia a dia da producao e entrega.',
    items: [...operationItems, ...analysisItems],
  },
  {
    title: 'Cadastrar',
    description: 'Cadastros principais do sistema.',
    items: registerItems,
  },
];

export const MENU_SECTIONS: NavigationSection[] = [
  {
    title: 'Operacao',
    description: 'Acesso rapido para os fluxos principais do sistema.',
    items: [...operationItems, ...analysisItems],
  },
  {
    title: 'Cadastrar',
    description: 'Cadastros organizados para consulta e manutencao.',
    items: registerItems,
  },
];

export const SEARCH_SHORTCUTS: NavigationShortcut[] = [
  ...SIDEBAR_SECTIONS.flatMap((section) => section.items),
  ...reportShortcutItems,
];
