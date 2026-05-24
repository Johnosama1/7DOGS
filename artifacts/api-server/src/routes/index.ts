import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import wheelRouter from "./wheel";
import referralsRouter from "./referrals";
import giftsRouter from "./gifts";
import settingsRouter from "./settings";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/users", usersRouter);
router.use("/wheel", wheelRouter);
router.use("/referrals", referralsRouter);
router.use("/gifts", giftsRouter);
router.use("/settings", settingsRouter);
router.use("/admin", adminRouter);

export default router;
