import { Router, type IRouter } from "express";
import healthRouter from "./health";
import summarizeRouter from "./summarize";
import extractUrlRouter from "./extract-url";

const router: IRouter = Router();

router.use(healthRouter);
router.use(summarizeRouter);
router.use(extractUrlRouter);

export default router;
