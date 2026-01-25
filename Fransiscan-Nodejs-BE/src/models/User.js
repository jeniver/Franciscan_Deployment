/**
 * User entity model
 */
class User {
  constructor(data = {}) {
    // Map database column names to model properties
    this.userId = data.UserId || data.userId || null;
    this.userName = data.UserName || data.userName || null;
    this.employeeId = data.EmployeeId || data.employeeId || null;
    this.roleId = data.RoleId || data.roleId || null;
    this.password = data.Password || data.password || null;
    this.active = data.IsActive !== undefined ? data.IsActive : (data.active !== undefined ? data.active : true);
    this.isLocked = data.isLocked !== undefined ? data.isLocked : false;
    this.failedLoginAttempts = data.failedLoginAttempts || 0;
    this.lastLoginDate = data.lastLoginDate || null;
    this.createdDate = data.createdDate || new Date();
    this.modifiedDate = data.modifiedDate || null;
    this.churchId = data.ChurchId || data.churchId || null;
  }

  // Remove sensitive data before sending to client
  toJSON() {
    const { password, ...userWithoutPassword } = this;
    return userWithoutPassword;
  }

  // Validate user data
  validate() {
    const errors = [];

    if (!this.userName || this.userName.trim().length === 0) {
      errors.push('Username is required');
    }

    if (this.userName && this.userName.length > 50) {
      errors.push('Username must not exceed 50 characters');
    }

    if (this.password && this.password.length < 6) {
      errors.push('Password must be at least 6 characters long');
    }

    return errors;
  }
}

module.exports = User;
