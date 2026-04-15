// ─── System table detection ─────────────────────────────────────────
export const SYSTEM_TABLES = new Set([
  'users', 'roles', 'collections', 'fields', 'migrations',
  'rolesCollections', 'rolesUsers', 'collectionsFields',
]);

export function isSystemTable(name) {
  return name.startsWith('_') || SYSTEM_TABLES.has(name);
}

// ─── Field interface → UI component mapping ─────────────────────────
export const FIELD_COMPONENT_MAP = {
  input: 'Input',
  textarea: 'Input.TextArea',
  email: 'Input',
  phone: 'Input',
  password: 'Password',
  number: 'InputNumber',
  integer: 'InputNumber',
  percent: 'Percent',
  checkbox: 'Checkbox',
  select: 'Select',
  radioGroup: 'Radio.Group',
  checkboxGroup: 'Checkbox.Group',
  datePicker: 'DatePicker',
  timePicker: 'TimePicker',
  url: 'Input',
  colorPicker: 'ColorPicker',
  icon: 'IconPicker',
  richText: 'RichText',
  attachment: 'Upload',
  m2o: 'AssociationField',
  belongsTo: 'AssociationField',
  o2m: 'AssociationField',
  hasMany: 'AssociationField',
  m2m: 'AssociationField',
  belongsToMany: 'AssociationField',
  json: 'Input.TextArea',
  text: 'Input.TextArea',
};

export const INTERFACE_TYPE_MAP = {
  input: 'string', textarea: 'text', email: 'string', phone: 'string',
  password: 'string', number: 'float', integer: 'bigInt', percent: 'float',
  checkbox: 'boolean', select: 'string', radioGroup: 'string',
  checkboxGroup: 'json', datePicker: 'date', timePicker: 'time',
  url: 'string', colorPicker: 'string', icon: 'string',
  richText: 'text', attachment: 'belongsToMany', json: 'json', text: 'text',
  m2o: 'belongsTo', belongsTo: 'belongsTo', o2m: 'hasMany', hasMany: 'hasMany',
  m2m: 'belongsToMany', belongsToMany: 'belongsToMany',
};

export const SORTABLE_INTERFACES = new Set(['number', 'integer', 'float', 'datePicker', 'timePicker', 'percent']);
export const FILTERABLE_INTERFACES = new Set(['input', 'textarea', 'select', 'm2o', 'belongsTo']);

export const SYSTEM_FIELDS = new Set([
  'id', 'created_at', 'createdAt', 'updated_at', 'updatedAt',
  'created_by_id', 'createdById', 'updated_by_id', 'updatedById',
]);

export function isSystemField(name) {
  return SYSTEM_FIELDS.has(name) || name.endsWith('_id');
}

export function getFieldTitle(field) {
  if (field.uiSchema?.title) return field.uiSchema.title;
  const map = {
    name: '名称', title: '标题', description: '描述', status: '状态',
    sort: '排序', price: '价格', quantity: '数量', count: '数量',
    phone: '手机号', mobile: '手机号', email: '邮箱', remark: '备注',
    note: '备注', icon: '图标', type: '类型', total: '金额', amount: '金额',
  };
  return map[field.name] || field.name;
}

// ─── Display Model mapping for table columns ────────────────────────
const NUMERIC_INTERFACES = new Set(['number', 'integer', 'percent', 'float']);
const SELECT_INTERFACES = new Set(['select', 'radioGroup']);
const CHECKBOX_INTERFACES = new Set(['checkbox']);
const DATE_INTERFACES = new Set(['datePicker', 'timePicker']);
export const BELONGS_TO_INTERFACES = new Set(['m2o', 'belongsTo']);
export const HAS_MANY_INTERFACES = new Set(['o2m', 'hasMany']);
export const M2M_INTERFACES = new Set(['m2m', 'belongsToMany']);

export function isBelongsToInterface(field) {
  return BELONGS_TO_INTERFACES.has(field.interface);
}

export function isHasManyInterface(field) {
  return HAS_MANY_INTERFACES.has(field.interface);
}

export function isAssociationField(field) {
  return BELONGS_TO_INTERFACES.has(field.interface) ||
         HAS_MANY_INTERFACES.has(field.interface) ||
         M2M_INTERFACES.has(field.interface);
}

export function getDisplayModel(field) {
  if (NUMERIC_INTERFACES.has(field.interface)) return 'DisplayNumberFieldModel';
  if (SELECT_INTERFACES.has(field.interface)) return 'DisplayEnumFieldModel';
  if (CHECKBOX_INTERFACES.has(field.interface)) return 'DisplayCheckboxFieldModel';
  if (DATE_INTERFACES.has(field.interface)) return 'DisplayDateFieldModel';
  // belongsTo/m2o 和 m2m/belongsToMany → DisplayTextFieldModel (配合关联配置)
  if (BELONGS_TO_INTERFACES.has(field.interface)) return 'DisplayTextFieldModel';
  if (M2M_INTERFACES.has(field.interface)) return 'DisplayTextFieldModel';
  // hasMany/o2m → DisplayTextFieldModel (文本展示，与 NocoBase UI 默认一致)
  if (HAS_MANY_INTERFACES.has(field.interface)) return 'DisplayTextFieldModel';
  return 'DisplayTextFieldModel';
}

// ─── Form field model mapping ──────────────────────────────────────
export const FORM_FIELD_MODEL_MAP = {
  input: 'InputFieldModel', textarea: 'TextareaFieldModel', email: 'InputFieldModel',
  phone: 'InputFieldModel', password: 'InputFieldModel', number: 'NumberFieldModel',
  integer: 'NumberFieldModel', percent: 'NumberFieldModel', checkbox: 'CheckboxFieldModel',
  select: 'SelectFieldModel', radioGroup: 'RadioGroupFieldModel',
  checkboxGroup: 'CheckboxGroupFieldModel', datePicker: 'DatePickerFieldModel',
  timePicker: 'TimePickerFieldModel', url: 'InputFieldModel', richText: 'RichTextFieldModel',
  m2o: 'RecordSelectFieldModel', belongsTo: 'RecordSelectFieldModel',
  m2m: 'RecordSelectFieldModel', belongsToMany: 'RecordSelectFieldModel',
};

export const FORM_SKIP_INTERFACES = new Set(['o2m', 'hasMany', 'json', 'attachment']);

export function getFormFieldModel(field) {
  return FORM_FIELD_MODEL_MAP[field.interface] || 'InputFieldModel';
}

// ─── Filter Form field model mapping ────────────────────────────────
export const FILTER_FIELD_MODEL_MAP = {
  input: 'InputFieldModel', textarea: 'InputFieldModel', email: 'InputFieldModel',
  phone: 'InputFieldModel', number: 'NumberFieldModel', integer: 'NumberFieldModel',
  percent: 'NumberFieldModel', select: 'SelectFieldModel', checkbox: 'InputFieldModel',
  datePicker: 'InputFieldModel', m2o: 'FilterFormRecordSelectFieldModel',
  belongsTo: 'FilterFormRecordSelectFieldModel',
};
