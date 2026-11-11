import { ExpectedScreen } from "@site/screens/ExpectedScreen";
import { courseMetadata, courseOr404, type CourseParams } from "@/lib/sites/page";

export async function generateMetadata({ params }: CourseParams) {
  return courseMetadata(params, "Expected at the exam");
}

export default async function CourseExpectedPage({ params }: CourseParams) {
  const { data } = await courseOr404(params);
  return <ExpectedScreen data={data} />;
}
