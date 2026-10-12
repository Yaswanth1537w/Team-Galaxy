import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole, Student } from '../types';
import { dataStore } from '../services/dataStore';

interface AuthContextType {
  currentUser: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    department?: string;
    studentRollNumber?: string;
  };
  setRole: (role: UserRole) => void;
  allRoles: { role: UserRole; label: string; desc: string }[];
  currentStudentProfile?: Student;
}

const ROLES: { role: UserRole; label: string; desc: string }[] = [
  { role: 'technical_incharge', label: 'Technical-Event In-Charge', desc: 'Imports attendance, sets thresholds, final event decision' },
  { role: 'proctor', label: 'Assigned Proctor / Mentor', desc: 'Inspects assigned students & submits recommendations' },
  { role: 'verifier', label: 'Authorized Verifier', desc: 'Reviews flagged data issues & manages verification queue' },
  { role: 'student', label: 'Student Portal (Aarav - 22CS0101)', desc: 'Views personal attendance, eligibility & event history' },
  { role: 'admin', label: 'Institutional Admin', desc: 'Master database access, user assignments & audit log inspection' },
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRoleState] = useState<UserRole>('technical_incharge');

  // Sync role-based demo user
  const getUserForRole = (r: UserRole) => {
    switch (r) {
      case 'student':
        return {
          id: 'STU-001',
          name: 'Aarav Sharma',
          email: 'aarav.22cs@campus.edu',
          role: 'student' as UserRole,
          department: 'Computer Science & Engineering',
          studentRollNumber: '22CS0101',
        };
      case 'proctor':
        return {
          id: 'PROC-01',
          name: 'Dr. Ramesh Kumar',
          email: 'ramesh.kumar@faculty.campus.edu',
          role: 'proctor' as UserRole,
          department: 'Computer Science & Engineering',
        };
      case 'verifier':
        return {
          id: 'VER-REV-01',
          name: 'Dr. Suresh Babu',
          email: 'suresh.babu@verifier.campus.edu',
          role: 'verifier' as UserRole,
          department: 'Academic Verification Cell',
        };
      case 'technical_incharge':
        return {
          id: 'TECH-HEAD-01',
          name: 'Prof. Ananthakrishnan',
          email: 'ananth.techhead@campus.edu',
          role: 'technical_incharge' as UserRole,
          department: 'Technical Affairs & Hackathon Cell',
        };
      case 'admin':
      default:
        return {
          id: 'ADMIN-01',
          name: 'Registrar Controller',
          email: 'registrar@campus.edu',
          role: 'admin' as UserRole,
          department: 'Academic Affairs',
        };
    }
  };

  const [currentUser, setCurrentUser] = useState(getUserForRole(role));

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    setCurrentUser(getUserForRole(newRole));
  };

  const studentProfile = currentUser.studentRollNumber
    ? dataStore.getStudentById(currentUser.studentRollNumber)
    : undefined;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        setRole,
        allRoles: ROLES,
        currentStudentProfile: studentProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
