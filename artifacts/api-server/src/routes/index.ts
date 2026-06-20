import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import propertiesRouter from "./properties";
import bookingsRouter from "./bookings";
import ratingsRouter from "./ratings";
import disputesRouter from "./disputes";
import messagesRouter from "./messages";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(propertiesRouter);
router.use(bookingsRouter);
router.use(ratingsRouter);
router.use(disputesRouter);
router.use(messagesRouter);
router.use(adminRouter);

export default router;
