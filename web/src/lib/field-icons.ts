import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  AtSign,
  Building2,
  Calendar,
  CalendarDays,
  Copy,
  FileText,
  Filter,
  Globe,
  Hash,
  KeyRound,
  LayoutGrid,
  Link2,
  List,
  ListOrdered,
  Lock,
  Mail,
  MessageSquare,
  Phone,
  Radio,
  Shield,
  Tag,
  TextCursorInput,
  Type,
  User,
  Users,
} from "lucide-react";
import type { RegistrationFieldType } from "@/lib/registration-form-config-shared";

const BUILTIN_KEY_ICONS: Record<string, LucideIcon> = {
  fullName: User,
  rank: Shield,
  entity: Building2,
  email: Mail,
  mobile: Phone,
  notes: MessageSquare,
  name: User,
  password: Lock,
  role: Users,
  eventName: Tag,
  eventDate: CalendarDays,
  slug: Link2,
  appUrl: Globe,
  version: Hash,
  labelAr: Type,
  labelEn: Type,
  placeholderAr: Type,
  placeholderEn: Type,
  options: List,
  enabled: List,
  required: List,
  date: Calendar,
  platformName: Globe,
  supportEmail: AtSign,
  supportPhone: Phone,
  qrInstructions: FileText,
  maintenanceMessage: MessageSquare,
  emailProvider: Mail,
  direction: ArrowLeftRight,
  cloneFrom: Copy,
  channel: Radio,
  pageSize: ListOrdered,
  locale: Globe,
  seatTierId: LayoutGrid,
  filter: Filter,
  withdrawalEmail: Mail,
  withdrawalMobile: Phone,
  withdrawalNote: MessageSquare,
};

const TYPE_ICONS: Record<RegistrationFieldType, LucideIcon> = {
  text: Type,
  email: Mail,
  tel: Phone,
  select: List,
  textarea: FileText,
  number: Hash,
  date: Calendar,
  url: Link2,
};

const INPUT_TYPE_ICONS: Record<string, LucideIcon> = {
  email: Mail,
  tel: Phone,
  password: Lock,
  url: Link2,
  date: Calendar,
  number: Hash,
};

export function resolveFieldIcon(options?: {
  key?: string;
  type?: string;
  inputType?: string;
}): LucideIcon {
  const key = options?.key?.trim();
  if (key && BUILTIN_KEY_ICONS[key]) {
    return BUILTIN_KEY_ICONS[key];
  }

  const fieldType = options?.type as RegistrationFieldType | undefined;
  if (fieldType && TYPE_ICONS[fieldType]) {
    return TYPE_ICONS[fieldType];
  }

  const inputType = options?.inputType?.trim();
  if (inputType && INPUT_TYPE_ICONS[inputType]) {
    return INPUT_TYPE_ICONS[inputType];
  }

  return TextCursorInput;
}

export { KeyRound };
