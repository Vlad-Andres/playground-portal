import { DifficultScreen } from "@site/screens/DifficultScreen";
import { courseMetadata, courseOr404, type CourseParams } from "@/lib/sites/page";

export async function generateMetadata({ params }: CourseParams) {
  return courseMetadata(params, "Difficult parts");
}

export default async function CourseDifficultPage({ params }: CourseParams) {
  const { data } = await courseOr404(params);
  return <DifficultScreen data={data} />;
}
