import { Router } from "express";
import multer from "multer";
import os from "node:os";
import path from "node:path";
import { env } from "../config/env.js";
import { requireAuth } from "../middleware/auth.js";
import * as editionController from "../controllers/editionController.js";
import * as pageController from "../controllers/pageController.js";
import * as segmentController from "../controllers/segmentController.js";
import * as themeController from "../controllers/themeController.js";

const router = Router();
router.use(requireAuth);

const upload = multer({
  dest: path.join(os.tmpdir(), "epaper", "uploads"),
  limits: { fileSize: env.MAX_PDF_UPLOAD_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Only PDF files are allowed"));
  },
});

router.get("/stats", editionController.getDashboardStats);
router.get("/editions", editionController.listEditions);
router.post("/editions", upload.single("pdf"), editionController.createEdition);
router.get("/editions/:id", editionController.getEdition);
router.patch("/editions/:id", editionController.updateEdition);
router.delete("/editions/:id", editionController.deleteEdition);
router.post("/editions/:id/publish", editionController.publishEdition);
router.post("/editions/:id/unpublish", editionController.unpublishEdition);
router.get(
  "/editions/:id/processing-status",
  editionController.getProcessingStatus
);
router.post(
  "/editions/:id/retry-processing",
  editionController.retryProcessing
);
router.get("/editions/:id/preview", editionController.previewEdition);
router.patch("/editions/:id/theme", themeController.updateEditionTheme);

router.get("/editions/:id/pages", pageController.listEditionPages);
router.patch("/editions/:id/pages/reorder", pageController.reorderPages);
router.get("/pages/:pageId", pageController.getPage);
router.patch("/pages/:pageId", pageController.updatePage);

router.get("/pages/:pageId/segments", segmentController.listPageSegments);
router.post("/pages/:pageId/segments", segmentController.createSegment);
router.put(
  "/pages/:pageId/segments/batch",
  segmentController.batchSegments
);
router.patch("/segments/:segmentId", segmentController.updateSegment);
router.delete("/segments/:segmentId", segmentController.deleteSegment);
router.get("/segments/:segmentId/crop", segmentController.getSegmentCrop);

router.get("/themes", themeController.listThemes);
router.get("/themes/:id", themeController.getTheme);

export default router;
