const User = require("../models/User");
const Order = require("../models/Order");
const Transaction = require("../models/Transaction");
const bcrypt = require("bcryptjs");
const PDFDocument = require('pdfkit');

/* ================= GET ADMIN PROFILE ================= */
exports.getAdminProfile = async (req, res) => {
  const admin = await User.findById(req.user._id).select("-password");
  res.json(admin);
};

/* ================= UPDATE ADMIN PROFILE ================= */
exports.updateAdminProfile = async (req, res) => {
  try {
    const updates = {
      fullName: req.body.fullName,
      email: req.body.email,
      phone: req.body.phone,
      dob: req.body.dob,
      location: req.body.location,
      bio: req.body.bio
    };

    //  If file uploaded, add to updates
    if (req.file) {
      updates.avatar = `/uploads/profiles/${req.file.filename}`;
    }

    // Filter undefined
    Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key]);

    const admin = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    ).select("-password");

    res.json({
      message: "Admin profile updated",
      admin
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

/* ================= CHANGE ADMIN PASSWORD ================= */
exports.changeAdminPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "All fields required" });
    }

    const admin = await User.findById(req.user._id);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password incorrect" });
    }

    admin.password = await bcrypt.hash(newPassword, 10);
    await admin.save();

    res.json({ message: "Password updated successfully" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= GET ALL CUSTOMERS (WITH STATS) ================= */
exports.getAllCustomers = async (req, res) => {
  try {
    const customers = await User.aggregate([
      {
        $match: { role: "user" } // Filter only customers (not admins)
      },
      {
        $lookup: {
          from: "orders",
          localField: "_id",
          foreignField: "user",
          as: "orders"
        }
      },
      {
        $project: {
          _id: 1,
          fullName: 1,
          email: 1,
          avatar: 1,
          createdAt: 1,
          isVerified: 1,
          isBlocked: 1, // Add this line
          totalOrders: { $size: "$orders" },
          totalSpend: {
            $sum: "$orders.totalAmount" // Summing totalAmount from orders
          }
        }
      },
      { $sort: { createdAt: -1 } }
    ]);

    res.json(customers);

  } catch (err) {
    console.error("Get customers error:", err);
    res.status(500).json({ message: "Failed to fetch customers" });
  }
}


/* ================= GET CUSTOMER DETAILS ================= */
exports.getCustomerDetails = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Fetch User
    const user = await User.findById(id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 2. Fetch Orders (Sorted by date desc)
    const orders = await Order.find({ user: id }).sort("-createdAt");

    // 3. Helper to aggregate order stats
    let totalOrders = orders.length;
    let completedOrders = orders.filter(o => o.orderStatus === "delivered").length;
    let cancelledOrders = orders.filter(o => o.orderStatus === "canceled").length;
    let totalSpend = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    // 4. Fetch Wallet Transactions (Sorted by date desc)
    const transactions = await Transaction.find({ user: id }).sort("-createdAt");

    // 5. Build Spending Chart Data (Last 6 Months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlySpend = await Order.aggregate([
      {
        $match: {
          user: user._id,
          createdAt: { $gte: sixMonthsAgo },
          orderStatus: { $ne: "canceled" } // Exclude canceled
        }
      },
      {
        $group: {
          _id: { $month: "$createdAt" }, // Group by month number (1-12)
          total: { $sum: "$totalAmount" }
        }
      }
    ]);

    res.json({
      user,
      stats: {
        totalOrders,
        completedOrders,
        cancelledOrders,
        totalSpend
      },
      orders,
      transactions,
      graphData: monthlySpend
    });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= GET CUSTOMER ANALYTICS ================= */
exports.getCustomerAnalytics = async (req, res) => {
  try {
    // 1. Counts
    const totalCustomers = await User.countDocuments({ role: "user" });
    const blocked = await User.countDocuments({ role: "user", isBlocked: true });

    // Verified Users (ignoring block status)
    const active = await User.countDocuments({ role: "user", isVerified: true });
    // Unverified Users (ignoring block status)
    const inactive = await User.countDocuments({ role: "user", isVerified: { $ne: true } });

    // 2. Growth Chart (Last 6 Months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const growth = await User.aggregate([
      {
        $match: {
          role: "user",
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    res.json({
      total: totalCustomers,
      active,
      inactive,
      blocked,
      growth
    });

  } catch (err) {
    console.error("Analytics error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= BLOCK/UNBLOCK USER ================= */
exports.blockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.isBlocked = !user.isBlocked; // Toggle status
    await user.save();

    res.json({
      message: user.isBlocked ? "User blocked successfully" : "User unblocked successfully",
      isBlocked: user.isBlocked
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= DELETE USER ================= */
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });



    res.json({ message: "User deleted successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= GET DASHBOARD STATS ================= */
exports.getDashboardStats = async (req, res) => {
  try {
    const { filter, startDate, endDate } = req.query;

    let queryStartDate = new Date();
    let queryEndDate = new Date();

    // Reset times
    queryStartDate.setHours(0, 0, 0, 0);
    queryEndDate.setHours(23, 59, 59, 999);

    //  Calculate Date Range
    switch (filter) {
      case 'today':
        break; // Already set to today
      case 'last_7_days':
        queryStartDate.setDate(queryStartDate.getDate() - 6);
        break;
      case 'last_1_month':
        queryStartDate.setMonth(queryStartDate.getMonth() - 1);
        break;
      case 'last_6_months':
        queryStartDate.setMonth(queryStartDate.getMonth() - 6);
        break;
      case 'last_1_year':
        queryStartDate.setFullYear(queryStartDate.getFullYear() - 1);
        break;
      case 'specific_date':
        if (startDate) {
          queryStartDate = new Date(startDate);
          queryEndDate = new Date(startDate);
          queryStartDate.setHours(0, 0, 0, 0);
          queryEndDate.setHours(23, 59, 59, 999);
        }
        break;
      case 'custom_range':
        if (startDate && endDate) {
          queryStartDate = new Date(startDate);
          queryEndDate = new Date(endDate);
          queryStartDate.setHours(0, 0, 0, 0);
          queryEndDate.setHours(23, 59, 59, 999);
        }
        break;
      case 'all_time':
        queryStartDate = new Date(0); // 1970
        break;
      default:
        // Default to Last 7 Days
        queryStartDate.setDate(queryStartDate.getDate() - 6);
    }

    const dateQuery = { createdAt: { $gte: queryStartDate, $lte: queryEndDate } };

    // 1. Gross Sales (Paid/Delivered in Range)
    // Logic: Payment is 'paid' OR (COD and Delivered)
    const grossSalesAgg = await Order.aggregate([
      {
        $match: {
          $and: [
            dateQuery,
            {
              $or: [
                { paymentStatus: "paid" },
                { $and: [{ paymentMethod: "COD" }, { orderStatus: "Delivered" }] }
              ]
            }
          ]
        }
      },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ]);
    const grossSales = grossSalesAgg.length > 0 ? grossSalesAgg[0].total : 0;

    // 2. Refunds (Approved Returns in Range)
    const refundsAgg = await Order.aggregate([
      {
        $match: {
          ...dateQuery,
          returnStatus: "approved"
        }
      },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ]);
    const refunds = refundsAgg.length > 0 ? refundsAgg[0].total : 0;

    const netSales = grossSales - refunds;

    // 3. New Orders (In Range)
    const newOrders = await Order.countDocuments(dateQuery);

    // 4. New Customers (In Range)
    const newCustomers = await User.countDocuments({
      role: "user",
      createdAt: { $gte: queryStartDate, $lte: queryEndDate }
    });

    // 5. Item Status Chart (In Range)
    const chartData = await Order.aggregate([
      { $match: dateQuery },
      { $unwind: "$items" },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          successful: {
            $sum: 1
          },
          cancelled: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ["$items.itemStatus", "canceled"] },
                    { $eq: ["$returnStatus", "approved"] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      netSales,
      newOrders,
      newCustomers,
      chartData,
      range: {
        start: queryStartDate,
        end: queryEndDate
      }
    });

  } catch (err) {
    console.error("Dashboard stats error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= GET ALL TRANSACTIONS ================= */
exports.getAllTransactions = async (req, res) => {
  try {
    const { filter, startDate, endDate, type, search, page = 1, limit = 10 } = req.query;

    let query = {};

    // 1. Date Filter Logic
    let queryStartDate = new Date(0);
    let queryEndDate = new Date();
    queryEndDate.setHours(23, 59, 59, 999);

    if (filter === 'today') {
      queryStartDate = new Date(); queryStartDate.setHours(0, 0, 0, 0);
    } else if (filter === 'last_7_days') {
      queryStartDate = new Date(); queryStartDate.setDate(queryStartDate.getDate() - 6); queryStartDate.setHours(0, 0, 0, 0);
    } else if (filter === 'last_1_month') {
      queryStartDate = new Date(); queryStartDate.setMonth(queryStartDate.getMonth() - 1); queryStartDate.setHours(0, 0, 0, 0);
    } else if (filter === 'specific_date' && startDate) {
      queryStartDate = new Date(startDate); queryStartDate.setHours(0, 0, 0, 0);
      queryEndDate = new Date(startDate); queryEndDate.setHours(23, 59, 59, 999);
    } else if (filter === 'custom_range' && startDate && endDate) {
      queryStartDate = new Date(startDate); queryStartDate.setHours(0, 0, 0, 0);
      queryEndDate = new Date(endDate); queryEndDate.setHours(23, 59, 59, 999);
    }

    query.date = { $gte: queryStartDate, $lte: queryEndDate };

    // 2. Type Filter
    if (type && type !== 'all') {
      query.type = type.toLowerCase();
    }

    // 3. Search Filter (TrxID or User Name/Email)
    if (search) {
      const users = await User.find({
        $or: [
          { fullName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');

      const userIds = users.map(u => u._id);

      query.$or = [
        { transactionId: { $regex: search, $options: 'i' } },
        { user: { $in: userIds } }
      ];
    }

    // 4. Fetch Results from Transaction Model
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [transactions, totalTransactions] = await Promise.all([
      Transaction.find(query)
        .populate("user", "fullName email")
        .populate("orderId")
        .sort({ date: -1 })
        .skip(skip)
        .limit(limitNum),
      Transaction.countDocuments(query)
    ]);

    // 5. Calculate Totals (on all matching results, not just paginated)
    const totals = await Transaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" }
        }
      }
    ]);

    const totalCredit = (totals.find(t => t._id === 'credit')?.total || 0);
    const totalDebit = (totals.find(t => t._id === 'debit')?.total || 0);

    // Transform for Frontend compatibility
    const formattedTransactions = transactions.map(t => ({
      trxId: t.transactionId,
      date: t.date,
      customer: t.user,
      items: t.description,
      method: t.paymentMethod || "N/A",
      type: t.type === 'credit' ? 'Credit' : 'Debit',
      amount: t.amount,
      status: t.status
    }));

    res.json({
      transactions: formattedTransactions,
      currentPage: pageNum,
      totalPages: Math.ceil(totalTransactions / limitNum),
      totalCredit,
      totalDebit
    });

  } catch (err) {
    console.error("Transaction fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
/* ================= GENERATE DASHBOARD PDF REPORT ================= */
exports.getDashboardReport = async (req, res) => {
  try {
    const { filter, startDate, endDate } = req.query;

    // Reuse Logic for Dates
    let queryStartDate = new Date();
    let queryEndDate = new Date();
    queryStartDate.setHours(0, 0, 0, 0);
    queryEndDate.setHours(23, 59, 59, 999);

    let dateLabel = "Today";

    switch (filter) {
      case 'today': dateLabel = "Today"; break;
      case 'last_7_days':
        queryStartDate.setDate(queryStartDate.getDate() - 6);
        dateLabel = "Last 7 Days";
        break;
      case 'last_1_month':
        queryStartDate.setMonth(queryStartDate.getMonth() - 1);
        dateLabel = "Last 1 Month";
        break;
      case 'last_6_months':
        queryStartDate.setMonth(queryStartDate.getMonth() - 6);
        dateLabel = "Last 6 Months";
        break;
      case 'last_1_year':
        queryStartDate.setFullYear(queryStartDate.getFullYear() - 1);
        dateLabel = "Last 1 Year";
        break;
      case 'specific_date':
        if (startDate) {
          queryStartDate = new Date(startDate);
          queryEndDate = new Date(startDate);
          queryStartDate.setHours(0, 0, 0, 0);
          queryEndDate.setHours(23, 59, 59, 999);
          dateLabel = `Date: ${startDate}`;
        }
        break;
      case 'custom_range':
        if (startDate && endDate) {
          queryStartDate = new Date(startDate);
          queryEndDate = new Date(endDate);
          queryStartDate.setHours(0, 0, 0, 0);
          queryEndDate.setHours(23, 59, 59, 999);
          dateLabel = `${startDate} to ${endDate}`;
        }
        break;
      case 'all_time':
        queryStartDate = new Date(0);
        dateLabel = "All Time";
        break;
      default:
        queryStartDate.setDate(queryStartDate.getDate() - 6);
        dateLabel = "Last 7 Days";
    }

    const dateQuery = { createdAt: { $gte: queryStartDate, $lte: queryEndDate } };

    // --- FETCH DATA (Reusing Logic) ---
    // 1. Gross Sales
    const grossSalesAgg = await Order.aggregate([
      {
        $match: {
          $and: [
            dateQuery,
            {
              $or: [
                { paymentStatus: "paid" },
                { $and: [{ paymentMethod: "COD" }, { orderStatus: "Delivered" }] }
              ]
            }
          ]
        }
      },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ]);
    const grossSales = grossSalesAgg.length > 0 ? grossSalesAgg[0].total : 0;

    // 2. Refunds
    const refundsAgg = await Order.aggregate([
      { $match: { ...dateQuery, returnStatus: "approved" } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ]);
    const refunds = refundsAgg.length > 0 ? refundsAgg[0].total : 0;
    const netSales = grossSales - refunds;

    // 3. New Orders & Customers
    const newOrders = await Order.countDocuments(dateQuery);
    const newCustomers = await User.countDocuments({
      role: "user",
      createdAt: { $gte: queryStartDate, $lte: queryEndDate }
    });

    // 4. Fetch Recent Orders for Table (Limit 20 for PDF to keep it short)
    const reportOrders = await Order.find(dateQuery)
      .populate("user", "fullName email")
      .sort({ createdAt: -1 })
      .limit(20);

    // --- GENERATE PDF ---
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=report_${Date.now()}.pdf`);

    doc.pipe(res);

    // HEADER
    doc.fontSize(20).text('Wings Admin - Sales Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Generated On: ${new Date().toLocaleString()}`, { align: 'center', color: 'grey' });
    doc.text(`Period: ${dateLabel}`, { align: 'center', color: 'grey' });
    doc.moveDown(2);

    // SUMMARY CARDS (Simple Text Representation)
    doc.fontSize(14).text('Summary Statistics', { underline: true });
    doc.moveDown(0.5);

    const startX = 50;
    let currentY = doc.y;

    doc.fontSize(12).text(`Net Sales: Rs. ${netSales.toLocaleString()}`, startX, currentY);
    doc.text(`Total Orders: ${newOrders}`, startX + 200, currentY);
    doc.text(`New Customers: ${newCustomers}`, startX + 400, currentY);

    doc.moveDown(3);

    // ORDER TABLE
    doc.fontSize(14).text(`Recent Orders (Top 20 in Period)`, { underline: true, x: 50 });
    doc.moveDown(1);

    // Table Header
    const tableTop = doc.y;
    const itemX = 50;
    const dateX = 150;
    const customerX = 280;
    const amountX = 430;
    const statusX = 500;

    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Order ID', itemX, tableTop);
    doc.text('Date', dateX, tableTop);
    doc.text('Customer', customerX, tableTop);
    doc.text('Amount', amountX, tableTop);
    doc.text('Status', statusX, tableTop);

    doc.moveTo(itemX, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    let y = tableTop + 25;
    doc.font('Helvetica').fontSize(9);

    reportOrders.forEach(order => {
      // Check page break
      if (y > 700) {
        doc.addPage();
        y = 50;
      }

      doc.text(`#${order._id.toString().slice(-6).toUpperCase()}`, itemX, y);
      doc.text(new Date(order.createdAt).toLocaleDateString(), dateX, y);
      doc.text(order.user?.fullName || 'Guest', customerX, y, { width: 140, ellipsis: true });
      doc.text(`Rs. ${order.totalAmount}`, amountX, y);
      doc.text(order.orderStatus, statusX, y);

      y += 20;
    });

    if (reportOrders.length === 0) {
      doc.text("No orders found in this period.", itemX, y + 10);
    }

    doc.end();

  } catch (err) {
    console.error("PDF Report Error:", err);
    res.status(500).send("Error generating report");
  }
};
