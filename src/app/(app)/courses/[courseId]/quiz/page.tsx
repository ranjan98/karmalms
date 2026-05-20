import Link from "next/link";
import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getCourse } from "@/lib/courses";
import { getEnrollment } from "@/lib/enrollments";
import {
  getQuiz,
  listQuestions,
  latestAttempt,
  questionOptions,
} from "@/lib/quizzes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { ConfirmButton } from "@/components/confirm-button";
import {
  createQuiz,
  updateQuiz,
  deleteQuiz,
  saveQuestion,
  deleteQuestion,
  submitQuiz,
} from "../../quiz-actions";

type Quiz = NonNullable<Awaited<ReturnType<typeof getQuiz>>>;
type Question = Awaited<ReturnType<typeof listQuestions>>[number];

export default async function QuizPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const user = await requireUser();
  const isAdmin = user.role === "admin";

  const course = await getCourse(courseId, user.orgId);
  if (!course) notFound();
  if (!isAdmin && !course.published) notFound();

  const quiz = await getQuiz(courseId);
  const questions = quiz ? await listQuestions(quiz.id) : [];

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href={`/courses/${courseId}`}
        className="text-muted-foreground hover:text-foreground text-sm"
      >
        ← {course.title}
      </Link>
      {isAdmin ? (
        <AdminQuiz courseId={courseId} quiz={quiz} questions={questions} />
      ) : (
        <LearnerQuiz
          courseId={courseId}
          userId={user.id}
          quiz={quiz}
          questions={questions}
        />
      )}
    </div>
  );
}

function AdminQuiz({
  courseId,
  quiz,
  questions,
}: {
  courseId: string;
  quiz: Quiz | null;
  questions: Question[];
}) {
  if (!quiz) {
    return (
      <div className="mt-4">
        <h1 className="text-2xl font-semibold tracking-tight">Quiz</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          This course has no quiz yet. Add one to test learners before they can
          complete the course.
        </p>
        <form action={createQuiz} className="mt-4">
          <input type="hidden" name="courseId" value={courseId} />
          <Button type="submit">Create quiz</Button>
        </form>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <h1 className="text-2xl font-semibold tracking-tight">Quiz</h1>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateQuiz} className="flex items-end gap-2">
            <input type="hidden" name="courseId" value={courseId} />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="passingScore">Passing score (%)</Label>
              <Input
                id="passingScore"
                name="passingScore"
                type="number"
                min={1}
                max={100}
                defaultValue={quiz.passingScore}
                className="w-28"
              />
            </div>
            <Button type="submit">Save</Button>
          </form>
        </CardContent>
      </Card>

      <h2 className="mt-8 text-lg font-semibold">Questions</h2>
      {questions.length === 0 && (
        <p className="text-muted-foreground mt-2 text-sm">No questions yet.</p>
      )}
      <div className="mt-3 flex flex-col gap-4">
        {questions.map((question, i) => (
          <div key={question.id} className="rounded-md border p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-muted-foreground text-sm font-medium">
                Question {i + 1}
              </span>
              <form action={deleteQuestion}>
                <input type="hidden" name="courseId" value={courseId} />
                <input type="hidden" name="questionId" value={question.id} />
                <ConfirmButton
                  type="submit"
                  variant="ghost"
                  size="icon"
                  aria-label="Delete question"
                  confirmText="Delete this question?"
                >
                  <Trash2 />
                </ConfirmButton>
              </form>
            </div>
            <QuestionForm courseId={courseId} question={question} />
          </div>
        ))}
      </div>

      <h3 className="mt-8 font-semibold">Add a question</h3>
      <div className="mt-3 rounded-md border p-4">
        <QuestionForm courseId={courseId} />
      </div>

      <Card className="border-destructive/40 mt-8">
        <CardHeader>
          <CardTitle className="text-base">Delete quiz</CardTitle>
          <CardDescription>
            Removes the quiz, its questions, and every attempt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={deleteQuiz}>
            <input type="hidden" name="courseId" value={courseId} />
            <ConfirmButton
              type="submit"
              variant="destructive"
              confirmText="Delete this quiz and all its questions?"
            >
              Delete quiz
            </ConfirmButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

/** Create/edit form for one question — four choices, one marked correct. */
function QuestionForm({
  courseId,
  question,
}: {
  courseId: string;
  question?: Question;
}) {
  const options = question ? questionOptions(question.options) : [];
  const correct = question?.correctIndex ?? 0;

  return (
    <form action={saveQuestion} className="flex flex-col gap-3">
      <input type="hidden" name="courseId" value={courseId} />
      {question && (
        <input type="hidden" name="questionId" value={question.id} />
      )}
      <Textarea
        name="prompt"
        defaultValue={question?.prompt ?? ""}
        placeholder="Question prompt"
        rows={2}
        required
      />
      <div className="flex flex-col gap-2">
        {[0, 1, 2, 3].map((i) => (
          <label key={i} className="flex items-center gap-2">
            <input
              type="radio"
              name="correctIndex"
              value={i}
              defaultChecked={correct === i}
              className="size-4 shrink-0"
              aria-label={`Mark choice ${i + 1} as correct`}
            />
            <Input
              name={`option${i}`}
              defaultValue={options[i] ?? ""}
              placeholder={`Choice ${i + 1}`}
              required
            />
          </label>
        ))}
      </div>
      <p className="text-muted-foreground text-xs">
        Select the radio next to the correct choice.
      </p>
      <div>
        <Button type="submit">
          {question ? "Save question" : "Add question"}
        </Button>
      </div>
    </form>
  );
}

async function LearnerQuiz({
  courseId,
  userId,
  quiz,
  questions,
}: {
  courseId: string;
  userId: string;
  quiz: Quiz | null;
  questions: Question[];
}) {
  if (!quiz || questions.length === 0) {
    return (
      <div className="mt-4">
        <h1 className="text-2xl font-semibold tracking-tight">Quiz</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          This course doesn&apos;t have a quiz yet.
        </p>
      </div>
    );
  }

  const enrollment = await getEnrollment(userId, courseId);
  const attempt = await latestAttempt(userId, quiz.id);

  return (
    <div className="mt-4">
      <h1 className="text-2xl font-semibold tracking-tight">Quiz</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        {questions.length} question{questions.length === 1 ? "" : "s"} · pass
        with {quiz.passingScore}% or higher.
      </p>

      {attempt && (
        <div className="mt-4 flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
          {attempt.passed ? (
            <Badge>Passed</Badge>
          ) : (
            <Badge variant="secondary">Not passed</Badge>
          )}
          <span className="text-muted-foreground">
            Most recent attempt: {attempt.score}%
          </span>
        </div>
      )}

      {!enrollment ? (
        <p className="text-muted-foreground mt-4 text-sm">
          You must be enrolled in this course to take the quiz.
        </p>
      ) : (
        <form action={submitQuiz} className="mt-6 flex flex-col gap-6">
          <input type="hidden" name="courseId" value={courseId} />
          {questions.map((question, qi) => {
            const options = questionOptions(question.options);
            return (
              <fieldset key={question.id} className="flex flex-col gap-2">
                <legend className="mb-1 font-medium">
                  {qi + 1}. {question.prompt}
                </legend>
                {options.map((option, oi) => (
                  <label key={oi} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name={`q_${question.id}`}
                      value={oi}
                      required
                      className="size-4 shrink-0"
                    />
                    {option}
                  </label>
                ))}
              </fieldset>
            );
          })}
          <div>
            <Button type="submit">
              {attempt ? "Retake quiz" : "Submit quiz"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
