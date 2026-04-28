import { Router, type IRouter } from "express";
import healthRouter from "./health";
import siteRouter from "./site";
import practiceAreasRouter from "./practice-areas";
import lawyersRouter from "./lawyers";
import servicesRouter from "./services";
import appointmentsRouter from "./appointments";
import testimonialsRouter from "./testimonials";
import faqsRouter from "./faqs";
import legalLibraryRouter from "./legal-library";
import blogRouter from "./blog";
import contactRouter from "./contact";
import chatRouter from "./chat";

import adminAuthRouter from "./admin/auth";
import adminDashboardRouter from "./admin/dashboard";
import adminClientsRouter from "./admin/clients";
import adminCasesRouter from "./admin/cases";
import adminAppointmentsRouter from "./admin/appointments";
import adminInvoicesRouter from "./admin/invoices";
import adminPaymentsRouter from "./admin/payments";
import adminChatRouter from "./admin/chat";
import adminContactInquiriesRouter from "./admin/contact-inquiries";
import adminLegalArticlesRouter from "./admin/legal-articles";
import adminBlogPostsRouter from "./admin/blog-posts";
import adminServicesRouter from "./admin/services";
import adminLawyersRouter from "./admin/lawyers";

const router: IRouter = Router();

router.use(healthRouter);
router.use(siteRouter);
router.use(practiceAreasRouter);
router.use(lawyersRouter);
router.use(servicesRouter);
router.use(appointmentsRouter);
router.use(testimonialsRouter);
router.use(faqsRouter);
router.use(legalLibraryRouter);
router.use(blogRouter);
router.use(contactRouter);
router.use(chatRouter);

router.use(adminAuthRouter);
router.use(adminDashboardRouter);
router.use(adminClientsRouter);
router.use(adminCasesRouter);
router.use(adminAppointmentsRouter);
router.use(adminInvoicesRouter);
router.use(adminPaymentsRouter);
router.use(adminChatRouter);
router.use(adminContactInquiriesRouter);
router.use(adminLegalArticlesRouter);
router.use(adminBlogPostsRouter);
router.use(adminServicesRouter);
router.use(adminLawyersRouter);

export default router;
