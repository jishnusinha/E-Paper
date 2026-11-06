import { Router } from "express";
import * as publicController from "../controllers/publicController.js";

const router = Router();

router.get("/editions/latest", publicController.getLatestEdition);
router.get("/editions/dates", publicController.listEditionDates);
router.get("/editions/:date", publicController.getEditionByDate);
router.get("/editions/:date/pages", publicController.getEditionPagesByDate);
router.get("/editions/:date/articles", publicController.getEditionArticlesByDate);
router.get("/pages/:pageId/segments", publicController.getPublicPageSegments);
router.get("/segments/:segmentId/crop", publicController.getPublicSegmentCrop);

export default router;
