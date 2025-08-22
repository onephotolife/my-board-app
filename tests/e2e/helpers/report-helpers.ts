import { connectDB } from '@/lib/db/mongodb-local';
import Report from '@/lib/models/Report';
import User from '@/lib/models/User';

export interface CreateReportData {
  postId: string;
  reportedById: string;
  reason: 'spam' | 'inappropriate' | 'harassment' | 'misinformation' | 'other';
  description: string;
}

export async function createTestReport(reportData: CreateReportData) {
  await connectDB();
  
  // 通報者情報を取得
  const reporter = await User.findById(reportData.reportedById);
  if (!reporter) {
    throw new Error('Reporter not found');
  }

  const report = await Report.create({
    postId: reportData.postId,
    reportedBy: {
      _id: reporter._id,
      name: reporter.name,
      email: reporter.email,
    },
    reason: reportData.reason,
    description: reportData.description,
    status: 'pending',
  });

  return report.toJSON();
}

export async function deleteTestReport(reportId: string) {
  await connectDB();
  await Report.findByIdAndDelete(reportId);
}

export async function resolveReport(
  reportId: string, 
  moderatorId: string, 
  action: 'none' | 'warning' | 'delete' | 'ban',
  notes?: string
) {
  await connectDB();
  
  const moderator = await User.findById(moderatorId);
  if (!moderator) {
    throw new Error('Moderator not found');
  }

  const report = await Report.findByIdAndUpdate(
    reportId,
    {
      status: 'resolved',
      action,
      moderatorNotes: notes,
      resolvedBy: {
        _id: moderator._id,
        name: moderator.name,
        email: moderator.email,
      },
      resolvedAt: new Date(),
    },
    { new: true }
  );

  return report?.toJSON();
}

export async function dismissReport(reportId: string, moderatorId: string, notes?: string) {
  await connectDB();
  
  const moderator = await User.findById(moderatorId);
  if (!moderator) {
    throw new Error('Moderator not found');
  }

  const report = await Report.findByIdAndUpdate(
    reportId,
    {
      status: 'dismissed',
      moderatorNotes: notes,
      resolvedBy: {
        _id: moderator._id,
        name: moderator.name,
        email: moderator.email,
      },
      resolvedAt: new Date(),
    },
    { new: true }
  );

  return report?.toJSON();
}

export async function createMultipleReports(postId: string, reporterIds: string[], reason = 'spam') {
  const reports = [];
  
  for (const reporterId of reporterIds) {
    const report = await createTestReport({
      postId,
      reportedById: reporterId,
      reason: reason as any,
      description: `Test report from user ${reporterId}`,
    });
    reports.push(report);
  }

  return reports;
}

export async function deleteMultipleReports(reportIds: string[]) {
  for (const reportId of reportIds) {
    await deleteTestReport(reportId);
  }
}

export async function getReportsByStatus(status: 'pending' | 'reviewing' | 'resolved' | 'dismissed') {
  await connectDB();
  
  const reports = await Report.find({ status }).lean();
  return reports;
}

export async function getReportsByReason(reason: string) {
  await connectDB();
  
  const reports = await Report.find({ reason }).lean();
  return reports;
}

export async function getReportsByPost(postId: string) {
  await connectDB();
  
  const reports = await Report.find({ postId }).lean();
  return reports;
}

export async function getReportsByReporter(reporterId: string) {
  await connectDB();
  
  const reports = await Report.find({ 'reportedBy._id': reporterId }).lean();
  return reports;
}

export async function getReportStatistics() {
  await connectDB();
  
  const stats = await Report.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const reasonStats = await Report.aggregate([
    {
      $group: {
        _id: '$reason',
        count: { $sum: 1 },
        pending: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        }
      }
    }
  ]);

  return {
    byStatus: stats,
    byReason: reasonStats,
  };
}

export async function withdrawReport(reportId: string) {
  await connectDB();
  
  const report = await Report.findById(reportId);
  if (!report) {
    throw new Error('Report not found');
  }

  if (report.status !== 'pending') {
    throw new Error('Only pending reports can be withdrawn');
  }

  await report.deleteOne();
  return true;
}