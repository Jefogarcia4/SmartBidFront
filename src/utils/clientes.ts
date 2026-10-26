/**
 * Prefijo del NIT que puso la carga del CRM cuando Bitrix no lo trae o lo trae redondeado
 * por Excel (los RUC largos de Ecuador, Honduras y Panamá salen del CRM pasados por un
 * float y los dígitos ya no se pueden recuperar).
 *
 * No es un NIT: es un hash del nombre, estable entre cargas, para que el cliente sea
 * seleccionable mientras alguien le completa el real desde Administración. Nunca se le
 * muestra al comercial — ni en el selector ni en la tabla — porque no significa nada.
 *
 * Tiene que coincidir con el marcador que genera db/tools/generar_carga_clientes.py.
 */
export const SIN_NIT = 'SIN-NIT-';

export const sinNit = (taxId: string) => taxId.startsWith(SIN_NIT);
