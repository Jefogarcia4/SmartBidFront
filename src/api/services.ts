import { http, tokenStore } from './http';
import { acquireMicrosoftToken, microsoftLogout } from '../auth/msal';
import type {
  AddBaseItemDto,
  CategoryDto,
  ChangeStatusDto,
  QuotationListItemDto,
  ClientDto,
  ContactDto,
  CreateCategoryDto,
  CreateClientDto,
  CreateContactDto,
  CreateExchangeRateDto,
  CreateProductDto,
  CreateQuotationDto,
  CreateSubcategoryDto,
  CurrentUser,
  ExchangeRateDto,
  PricingSettingsDto,
  ProductDto,
  QuotationDto,
  SubcategoryDto,
  UpdateCategoryDto,
  UpdateClientDto,
  UpdateProductDto,
  UpdateSubcategoryDto,
} from '../types/api';

export const authApi = {
  /** Valida credenciales Basic contra /api/auth/me. */
  async login(email: string, password: string): Promise<CurrentUser> {
    tokenStore.set(email, password);
    try {
      return await http.get<CurrentUser>('/api/auth/me');
    } catch (e) {
      tokenStore.clear();
      throw e;
    }
  },
  /** Login con Office 365: popup de Microsoft y validación del token contra el API. */
  async loginWithMicrosoft(): Promise<CurrentUser> {
    const token = await acquireMicrosoftToken();
    tokenStore.setBearer(token);
    try {
      return await http.get<CurrentUser>('/api/auth/me');
    } catch (e) {
      tokenStore.clear();
      throw e;
    }
  },
  /** SOLO DEV: simula el SSO sin Azure ("Bearer dev:<email>", aceptado por el API en Development). */
  async loginWithMicrosoftDev(email: string): Promise<CurrentUser> {
    tokenStore.setBearer(`dev:${email}`);
    try {
      return await http.get<CurrentUser>('/api/auth/me');
    } catch (e) {
      tokenStore.clear();
      throw e;
    }
  },
  me: () => http.get<CurrentUser>('/api/auth/me'),
  logout: () => {
    tokenStore.clear();
    void microsoftLogout();
  },
};

export const catalogApi = {
  categories: () => http.get<CategoryDto[]>('/api/categories'),
  createCategory: (dto: CreateCategoryDto) => http.post<CategoryDto>('/api/categories', dto),
  updateCategory: (id: number, dto: UpdateCategoryDto) =>
    http.put<CategoryDto>(`/api/categories/${id}`, dto),

  subcategories: (categoryId?: number) =>
    http.get<SubcategoryDto[]>(
      `/api/subcategories${categoryId ? `?categoryId=${categoryId}` : ''}`,
    ),
  createSubcategory: (dto: CreateSubcategoryDto) =>
    http.post<SubcategoryDto>('/api/subcategories', dto),
  updateSubcategory: (id: number, dto: UpdateSubcategoryDto) =>
    http.put<SubcategoryDto>(`/api/subcategories/${id}`, dto),

  products: (filter: {
    categoryId?: number;
    subcategoryId?: number;
    search?: string;
    isAddOn?: boolean;
    /** undefined = solo activos (catálogo); null = todos (admin) */
    isActive?: boolean | null;
  }) => {
    const qs = new URLSearchParams();
    if (filter.categoryId) qs.set('categoryId', String(filter.categoryId));
    if (filter.subcategoryId) qs.set('subcategoryId', String(filter.subcategoryId));
    if (filter.search) qs.set('search', filter.search);
    if (filter.isAddOn !== undefined) qs.set('isAddOn', String(filter.isAddOn));
    if (filter.isActive !== null) qs.set('isActive', String(filter.isActive ?? true));
    return http.get<ProductDto[]>(`/api/products?${qs.toString()}`);
  },
  createProduct: (dto: CreateProductDto) => http.post<ProductDto>('/api/products', dto),
  updateProduct: (id: number, dto: UpdateProductDto) =>
    http.put<ProductDto>(`/api/products/${id}`, dto),
  deactivateProduct: (id: number) => http.del<void>(`/api/products/${id}`),
  compatibleAddOns: (productId: number) =>
    http.get<ProductDto[]>(`/api/products/${productId}/addons`),
  linkAddOn: (productId: number, addOnId: number) =>
    http.post<void>(`/api/products/${productId}/addons`, { addOnId }),
  unlinkAddOn: (productId: number, addOnId: number) =>
    http.del<void>(`/api/products/${productId}/addons/${addOnId}`),
};

export const clientsApi = {
  list: (search?: string) =>
    http.get<ClientDto[]>(`/api/clients${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  create: (dto: CreateClientDto) => http.post<ClientDto>('/api/clients', dto),
  update: (id: number, dto: UpdateClientDto) => http.put<ClientDto>(`/api/clients/${id}`, dto),
  addContact: (clientId: number, dto: CreateContactDto) =>
    http.post<ContactDto>(`/api/clients/${clientId}/contacts`, dto),
};

export const settingsApi = {
  getPricing: () => http.get<PricingSettingsDto>('/api/settings/pricing'),
  setPricing: (dto: PricingSettingsDto) =>
    http.put<PricingSettingsDto>('/api/settings/pricing', dto),
};

export const exchangeRatesApi = {
  list: () => http.get<ExchangeRateDto[]>('/api/exchangerates'),
  current: () => http.get<ExchangeRateDto>('/api/exchangerates/current'),
  create: (dto: CreateExchangeRateDto) => http.post<ExchangeRateDto>('/api/exchangerates', dto),
};

export const quotationsApi = {
  create: (dto: CreateQuotationDto) => http.post<QuotationDto>('/api/quotations', dto),
  addItem: (quotationId: number, dto: AddBaseItemDto) =>
    http.post<QuotationDto>(`/api/quotations/${quotationId}/items`, dto),
  get: (id: number) => http.get<QuotationDto>(`/api/quotations/${id}`),
  search: (filter: {
    userId?: number;
    clientId?: number;
    statusId?: number;
    fromDate?: string;
    toDate?: string;
  }) => {
    const qs = new URLSearchParams();
    if (filter.userId) qs.set('userId', String(filter.userId));
    if (filter.clientId) qs.set('clientId', String(filter.clientId));
    if (filter.statusId) qs.set('statusId', String(filter.statusId));
    if (filter.fromDate) qs.set('fromDate', filter.fromDate);
    if (filter.toDate) qs.set('toDate', filter.toDate);
    return http.get<QuotationListItemDto[]>(`/api/quotations?${qs.toString()}`);
  },
  changeStatus: (id: number, dto: ChangeStatusDto) =>
    http.put<QuotationDto>(`/api/quotations/${id}/status`, dto),
  /** Documento Word de la cotización (textos redactados con FlexGPT en el backend). */
  generateDocument: (id: number) => http.blob(`/api/quotations/${id}/document`),
};
