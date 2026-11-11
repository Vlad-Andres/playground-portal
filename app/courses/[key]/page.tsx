import { HomeScreen } from "@site/screens/HomeScreen";
import { courseOr404, type CourseParams } from "@/lib/sites/page";

export default async function CourseHomePage({ params }: CourseParams) {
  const { data } = await courseOr404(params);
  return <HomeScreen data={data} />;
}
