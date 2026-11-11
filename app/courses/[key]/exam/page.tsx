import { ExamScreen } from "@site/screens/ExamScreen";
import { courseMetadata, courseOr404, type CourseParams } from "@/lib/sites/page";

export async function generateMetadata({ params }: CourseParams) {
  return courseMetadata(params, "Exam training");
}

export default async function CourseExamPage({ params }: CourseParams) {
  const { data } = await courseOr404(params);
  return <ExamScreen data={data} />;
}
