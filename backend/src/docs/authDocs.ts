// POST /api/auth/login
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Authenticate user and return token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@lastmart.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: admin123
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Server error
 */

// POST /api/auth/register
/**
 * 
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user (Customer or Vendor)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [customer, vendor]
 *               city:
 *                 type: string
 *               store_name:
 *                 type: string
 *                 description: Required if role is vendor
 *               store_description:
 *                 type: string
 *               category:
 *                 type: string
 *               referral_code:
 *                 type: string
 *                 description: Optional referral code from another user
 *     responses:
 *       201:
 *         description: Registration successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                     token:
 *                       type: string
 *       400:
 *         description: Validation error or email already exists
 */

// POST /api/auth/logout
/**
 * 
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout the current user
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Logout successful
 */

// POST /api/auth/verify-user
/**
 * 
 * @swagger
 * /api/auth/verify-user:
 *   post:
 *    summary: Verify the email of a user that just registered 
 *    tags: [Authentication]
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *          required:
 *             - token
 *          properties:
 *              email:
 *                token: number
 *    responses:
 *      201:
 *        description: User verified successfully
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *            properties:
 *              success:
 *                type: boolean
 *      400:
 *        description: Validation error
 */

// POST /api/auth/resend-veification
/**
 * 
 * @swagger
 * /api/auth/resend-veification:
 *   post:
 *    summary: Resends a verification code to the user's email 
 *    tags: [Authentication]
 *    responses:
 *      201:
 *        description: Verification code resent
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *            properties:
 *              success:
 *                type: boolean
 *      400:
 *        description: Validation error
 */