// DTOs espejo del API SmartBid (.NET 8)

export interface CurrentUser {
  userId: string;
  fullName: string;
  email: string;
  role: string;
}

export interface CategoryDto {
  categoryId: number;
  name: string;
  icon: string | null;
  description: string | null;
  isActive: boolean;
}

export interface SubcategoryDto {
  subcategoryId: number;
  categoryId: number;
  name: string;
  description: string | null;
  isActive: boolean;
}

/** Tipo de paquete: Base, Add-on, Prueba / Validación, Mantenimiento… */
export interface PackageTypeDto {
  packageTypeId: number;
  name: string;
  description: string | null;
  /** Los paquetes de este tipo se cotizan como complemento de un paquete base */
  isAddOnType: boolean;
  sortOrder: number;
  isActive: boolean;
}

/** Perfil que ejecuta el paquete (PM, Junior, Implementador, Senior). */
export interface DeliveryRoleDto {
  deliveryRoleId: number;
  code: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

/** Horas estimadas de un paquete para un rol de entrega. */
export interface ProductRoleHourDto {
  deliveryRoleId: number;
  roleCode: string;
  roleName: string;
  hours: number;
}

export interface SetRoleHourDto {
  deliveryRoleId: number;
  hours: number;
}

export interface ProductDto {
  productId: number;
  code: string;
  name: string;
  packageTypeId: number | null;
  packageTypeName: string | null;
  /** Tecnologías sobre las que se ejecuta; multivalor separado por " / " */
  platform: string | null;
  /** Qué logra el paquete, en una frase */
  objective: string | null;
  /** Actividades incluidas */
  scope: string | null;
  /** Lo que el cliente debe tener listo */
  prerequisites: string | null;
  /** Lo que queda fuera del alcance */
  exclusions: string | null;
  /** Total de horas; es la suma de roleHours */
  estimatedHours: number | null;
  roleHours: ProductRoleHourDto[];
  subcategoryId: number;
  subcategoryName: string;
  categoryName: string;
  /** Precio base en USD */
  priceUSD: number;
  /** Calculado por el API: priceUSD * TRM vigente */
  priceCOP: number;
  isAddOn: boolean;
  maxQuantity: number | null;
  isActive: boolean;
}

export interface ContactDto {
  contactId: number;
  clientId: number;
  name: string;
  jobTitle: string | null;
  email: string | null;
  phone: string | null;
  isActive: boolean;
}

export interface ClientDto {
  clientId: number;
  taxId: string;
  businessName: string;
  sector: string | null;
  city: string | null;
  isActive: boolean;
  contacts: ContactDto[];
}

export interface QuotationItemDto {
  quotationItemId: number;
  productId: number;
  productCode: string;
  productName: string;
  quantity: number;
  unitPriceCOP: number;
  isAddOn: boolean;
  parentItemId: number | null;
  lineSubtotalCOP: number;
}

export interface QuotationDto {
  quotationId: number;
  number: string;
  clientId: number;
  clientName: string;
  contactId: number | null;
  userId: number;
  salesRepName: string;
  exchangeRateId: number | null;
  statusId: number;
  statusName: string;
  presentationCurrency: string;
  discountPercent: number;
  discountApproved: boolean;
  subtotalCOP: number;
  discountAmountCOP: number;
  totalCOP: number;
  totalUSD: number | null;
  creationDate: string;
  validityDate: string;
  notes: string | null;
  conditions: string | null;
  isArchived: boolean;
  items: QuotationItemDto[];
}

export interface CreateQuotationDto {
  clientId: number;
  contactId?: number | null;
  exchangeRateId?: number | null;
  presentationCurrency?: string;
  validityDays?: number;
  notes?: string | null;
  conditions?: string | null;
}

export interface AddOnLineDto {
  productId: number;
  quantity: number;
}

export interface AddBaseItemDto {
  productId: number;
  quantity: number;
  addOns?: AddOnLineDto[];
}

export interface QuotationListItemDto {
  quotationId: number;
  number: string;
  clientName: string;
  salesRepName: string;
  statusName: string;
  discountPercent: number;
  totalCOP: number;
  totalUSD: number | null;
  creationDate: string;
  validityDate: string;
}

export interface ChangeStatusDto {
  statusId: number;
  note: string | null;
}

/** Estados de cotización (dbo.QuotationStatuses). */
export const QUOTATION_STATUSES = [
  { id: 1, code: 'Draft', name: 'Borrador' },
  { id: 2, code: 'InReview', name: 'En Revisión' },
  { id: 3, code: 'Sent', name: 'Enviada' },
  { id: 4, code: 'Accepted', name: 'Aceptada' },
  { id: 5, code: 'Rejected', name: 'Rechazada' },
  { id: 6, code: 'Expired', name: 'Expirada' },
] as const;

// ----- Administración -----

export interface CreateCategoryDto {
  name: string;
  icon: string | null;
  description: string | null;
}

export interface UpdateCategoryDto extends CreateCategoryDto {
  isActive: boolean;
}

export interface CreateSubcategoryDto {
  categoryId: number;
  name: string;
  description: string | null;
}

export interface UpdateSubcategoryDto {
  name: string;
  description: string | null;
  isActive: boolean;
}

/** Ficha técnica del paquete; compartida por creación y edición. */
interface ProductSheetDto {
  scope: string | null;
  subcategoryId: number;
  maxQuantity: number | null;
  packageTypeId?: number | null;
  platform?: string | null;
  objective?: string | null;
  prerequisites?: string | null;
  exclusions?: string | null;
  /** null/undefined = no tocar las horas; [] = borrarlas */
  roleHours?: SetRoleHourDto[] | null;
  priceCOP?: number | null;
  priceUSD?: number | null;
}

// El modo de precios (useTrmPricing) define cuál campo se envía:
// COP directo (defecto) → priceCOP; conversión TRM habilitada → priceUSD
// isAddOn se deriva del tipo de paquete cuando se envía packageTypeId.
export interface CreateProductDto extends ProductSheetDto {
  code: string;
  name: string;
  isAddOn: boolean;
}

export interface UpdateProductDto extends ProductSheetDto {
  name: string;
  isActive: boolean;
}

export interface PricingSettingsDto {
  /** false (defecto): precios directos en COP. true: COP = priceUSD * TRM vigente. */
  useTrmPricing: boolean;
}

export interface CreateClientDto {
  taxId: string;
  businessName: string;
  sector: string | null;
  city: string | null;
}

export interface UpdateClientDto {
  businessName: string;
  sector: string | null;
  city: string | null;
  isActive: boolean;
}

export interface CreateContactDto {
  name: string;
  jobTitle: string | null;
  email: string | null;
  phone: string | null;
}

export interface ExchangeRateDto {
  exchangeRateId: number;
  effectiveDate: string;
  rateUSDCOP: number;
  registeredByUserId: number;
  registeredAt: string;
}

export interface CreateExchangeRateDto {
  effectiveDate: string;
  rateUSDCOP: number;
}

// ---------- Integración FlexGPT: API keys del tool server ----------

export interface ApiKeyDto {
  apiKeyId: number;
  name: string;
  /** Primeros caracteres, para identificarla sin revelarla */
  keyPrefix: string;
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  isActive: boolean;
}

/** Vista de ADMIN: incluye a quién pertenece la key. */
export interface ApiKeyAdminDto extends ApiKeyDto {
  userId: number;
  userEmail: string;
  userFullName: string;
  userIsActive: boolean;
}

/** El valor en claro de `apiKey` solo llega en la respuesta de creación. */
export interface IssuedApiKeyDto {
  info: ApiKeyDto;
  apiKey: string;
}

export interface UserOptionDto {
  userId: number;
  fullName: string;
  email: string;
  roleCode: string;
  isActive: boolean;
}

