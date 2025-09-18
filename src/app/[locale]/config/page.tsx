import { redirect } from "@/i18n/routing";

export default function ConfigIndexPage() {
  redirect({ pathname: "/config/event" });
}
