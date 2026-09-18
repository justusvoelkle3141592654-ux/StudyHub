import type { DbAdapter } from "../db/adapter";
import { SubjectRepository } from "./subjects";
import { TimetableRepository } from "./timetable";
import { TaskRepository } from "./tasks";
import { ExamRepository } from "./exams";
import { FolderRepository } from "./folders";
import { NoteFileRepository, NoteRepository, NoteTagRepository } from "./notes";
import { FlashcardDeckRepository, FlashcardRepository, FlashcardReviewRepository } from "./flashcards";
import { GradeRepository } from "./grades";
import { FileRepository } from "./files";
import { DocumentRepository } from "./documents";
import { SettingsRepository } from "./settings";
import { SyncQueueRepository } from "./syncQueue";

/** All repositories bound to one database connection. */
export class Repositories {
  readonly subjects: SubjectRepository;
  readonly timetable: TimetableRepository;
  readonly tasks: TaskRepository;
  readonly exams: ExamRepository;
  readonly folders: FolderRepository;
  readonly notes: NoteRepository;
  readonly noteTags: NoteTagRepository;
  readonly noteFiles: NoteFileRepository;
  readonly decks: FlashcardDeckRepository;
  readonly flashcards: FlashcardRepository;
  readonly reviews: FlashcardReviewRepository;
  readonly grades: GradeRepository;
  readonly files: FileRepository;
  readonly documents: DocumentRepository;
  readonly settings: SettingsRepository;
  readonly syncQueue: SyncQueueRepository;

  constructor(readonly db: DbAdapter) {
    this.subjects = new SubjectRepository(db);
    this.timetable = new TimetableRepository(db);
    this.tasks = new TaskRepository(db);
    this.exams = new ExamRepository(db);
    this.folders = new FolderRepository(db);
    this.notes = new NoteRepository(db);
    this.noteTags = new NoteTagRepository(db);
    this.noteFiles = new NoteFileRepository(db);
    this.decks = new FlashcardDeckRepository(db);
    this.flashcards = new FlashcardRepository(db);
    this.reviews = new FlashcardReviewRepository(db);
    this.grades = new GradeRepository(db);
    this.files = new FileRepository(db);
    this.documents = new DocumentRepository(db);
    this.settings = new SettingsRepository(db);
    this.syncQueue = new SyncQueueRepository(db);
  }

  /** Repositories of all synchronised content tables, keyed by table name. */
  get syncedTables() {
    return {
      subjects: this.subjects,
      timetable_slots: this.timetable,
      tasks: this.tasks,
      exams: this.exams,
      folders: this.folders,
      notes: this.notes,
      note_tags: this.noteTags,
      note_files: this.noteFiles,
      flashcard_decks: this.decks,
      flashcards: this.flashcards,
      flashcard_reviews: this.reviews,
      grades: this.grades,
      files: this.files,
      documents: this.documents,
    } as const;
  }
}
