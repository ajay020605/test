import express from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import authMiddleware  from "../middleware/auth";    

const router = express.Router();
const prisma = new PrismaClient();

// Schemas
const createQuestionSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  userId: z.number(),
});

const createAnswerSchema = z.object({
  content: z.string().min(1),
  userId: z.number(),
});

// Create a new question
router.post("/", authMiddleware , async (req, res) => {
  try {
    const { title, content, userId } = createQuestionSchema.parse(req.body);

    const question = await prisma.question.create({
      data: { title, content, userId },
      include: {
        user: { select: { id: true, username: true } },
        answers: {
          include: { user: { select: { id: true, username: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    res.status(201).json(question);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create question" });
  }
});

// Get all questions
router.get("/", authMiddleware , async (req, res) => {
  try {
    const questions = await prisma.question.findMany({
      include: {
        user: { select: { id: true, username: true } },
        answers: {
          include: { user: { select: { id: true, username: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(questions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch questions" });
  }
});


// Reply to a question (create answer)
router.post("/:questionId/answers", authMiddleware , async (req, res) => {
  try {
    const questionId = parseInt(req.params.questionId);
    const { content, userId } = createAnswerSchema.parse(req.body);

    const question = await prisma.question.findUnique({ where: { id: questionId } });
    if (!question) return res.status(404).json({ error: "Question not found" });

    const answer = await prisma.answer.create({
      data: { content, userId, questionId },
      include: {
        user: { select: { id: true, username: true } },
        question: { select: { id: true, title: true } },
      },
    });

    res.status(201).json(answer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create answer" });
  }
});

// Upvote an answer
router.post("/answers/:id/upvote",authMiddleware, async (req, res) => {
  try {
    const answerId = parseInt(req.params.id);

    const answer = await prisma.answer.update({
      where: { id: answerId },
      data: { likes: { increment: 1 } },
      include: {
        user: { select: { id: true, username: true } },
        question: { select: { id: true, title: true } },
      },
    });

    res.json(answer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to upvote answer" });
  }
});

// Get answers for a question
router.get("/:questionId/answers",authMiddleware, async (req, res) => {
  try {
    const questionId = parseInt(req.params.questionId);
    const answers = await prisma.answer.findMany({
      where: { questionId },
      include: { user: { select: { id: true, username: true } } },
      orderBy: [{ likes: "desc" }, { createdAt: "desc" }],
    });

    res.json(answers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch answers" });
  }
});

// Search questions and answers
router.get("/search", authMiddleware ,async (req, res) => {
  try {
    const { q: searchTerm } = req.query;
    if (!searchTerm) return res.status(400).json({ error: "Search term required" });

    const questions = await prisma.question.findMany({
      where: {
        OR: [
          { title: { contains: searchTerm, mode: "insensitive" } },
          { content: { contains: searchTerm, mode: "insensitive" } },
        ],
      },
      include: {
        user: { select: { id: true, username: true } },
        answers: { include: { user: { select: { id: true, username: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    const answers = await prisma.answer.findMany({
      where: { content: { contains: searchTerm, mode: "insensitive" } },
      include: {
        user: { select: { id: true, username: true } },
        question: { include: { user: { select: { id: true, username: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ questions, answers, searchTerm });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to search" });
  }
});

export default router;
