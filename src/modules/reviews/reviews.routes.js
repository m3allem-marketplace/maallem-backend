const express = require("express");
const { protect } = require("../auth/auth.middleware");
const { validateRequest } = require("../../middlewares/validateRequest");
const { createReviewSchema } = require("./reviews.validation");
const { createReview, getWorkerReviews } = require("./reviews.controller");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Reviews
 *   description: Worker reviews management
 */

/**
 * @swagger
 * /reviews/{workerId}:
 *   post:
 *     summary: Add a review for a worker
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workerId
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID of the worker being reviewed
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *             properties:
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *                 maxLength: 1000
 *               booking:
 *                 type: string
 *                 description: ID of the booking associated with this review (optional)
 *               project:
 *                 type: string
 *                 description: ID of the project associated with this review (optional)
 *     responses:
 *       201:
 *         description: Review added successfully
 *       400:
 *         description: Bad request (e.g. self-review)
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Worker not found
 */
router.post(
  "/:workerId",
  protect,
  validateRequest(createReviewSchema),
  createReview
);

/**
 * @swagger
 * /reviews/{workerId}:
 *   get:
 *     summary: Get all reviews for a worker
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: workerId
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID of the worker
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of reviews
 */
router.get("/:workerId", getWorkerReviews);

module.exports = router;
