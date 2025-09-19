import { redirect } from "next/navigation";

type ConfigIndexPageProps = {
  params: {
    locale: string;
  };
};

export default function ConfigIndexPage({ params }: ConfigIndexPageProps) {
  redirect(`/${params.locale}/config/event`);
}
