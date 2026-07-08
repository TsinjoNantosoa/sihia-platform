import type { Project, Task, Employee, JobOpening, Candidate } from '@/lib/api/types';
import { uuid, daysAgo, daysFromNow, AVATAR_COLORS, FIRST_NAMES, LAST_NAMES, randomColor } from './helpers';

const PROJECT_COLORS = ['#4f46e5', '#0d9488', '#f59e0b', '#ec4899', '#3b82f6', '#84cc16'];

export const MOCK_PROJECTS: Project[] = Array.from({ length: 15 }, (_, i) => {
  const statuses: Project['status'][] = ['planning', 'active', 'active', 'active', 'on_hold', 'completed'];
  const teamSize = (i % 4) + 2;
  return {
    id: `project-${i + 1}`,
    name: [
      'Refonte plateforme e-commerce', 'Migration infrastructure cloud', 'Application mobile v2',
      'Programme de transformation digitale', 'Implementation ERP', 'Site vitrine corporate',
      'Dashboard analytics', 'Refonte CI/CD', 'Chatbot support client', 'API gateway',
      'Data warehouse', 'Portail partenaire', 'Système de billetterie', 'Plateforme SaaS B2B',
      'Audit sécurité',
    ][i],
    description: 'Projet stratégique visant à améliorer l\'expérience utilisateur et la performance opérationnelle.',
    status: statuses[i % statuses.length],
    progress: i < 5 ? (i + 1) * 15 : i < 10 ? 40 + i * 5 : 100,
    startDate: daysAgo(i * 10 + 30),
    endDate: daysFromNow(i * 5 + 14),
    budget: (i + 1) * 25000,
    spent: Math.round((i + 1) * 25000 * (i < 5 ? (i + 1) * 0.15 : 0.6)),
    teamMembers: Array.from({ length: teamSize }, (_, j) => ({
      id: `user-${j + 1}`,
      name: `${FIRST_NAMES[j % FIRST_NAMES.length]} ${LAST_NAMES[(j * 3) % LAST_NAMES.length]}`,
      avatarColor: AVATAR_COLORS[j % AVATAR_COLORS.length],
      role: ['Lead', 'Developer', 'Designer', 'QA', 'PM'][j % 5],
    })),
    taskCount: (i + 3) * 4,
    completedTasks: Math.round((i + 3) * 4 * (i < 5 ? 0.2 : 0.7)),
    color: PROJECT_COLORS[i % PROJECT_COLORS.length],
  };
});

const TASK_STATUSES: Task['status'][] = ['todo', 'in_progress', 'review', 'done'];
const TASK_PRIORITIES: Task['priority'][] = ['low', 'medium', 'high', 'urgent'];

export const MOCK_TASKS: Task[] = Array.from({ length: 40 }, (_, i) => {
  const status = TASK_STATUSES[i % 4];
  return {
    id: `task-${i + 1}`,
    title: [
      'Configurer environnement staging', 'Réviser pull request #142', 'Créer maquettes Figma',
      'Écrire tests E2E', 'Documenter API publique', 'Optimiser requêtes SQL',
      'Préparer démo client', 'Mettre à jour dépendances', 'Corriger bug authentification',
      'Implémenter dark mode', 'Refactorer composants UI', 'Setup monitoring',
    ][i % 12],
    description: 'Tâche importante pour le bon déroulement du projet.',
    status,
    priority: TASK_PRIORITIES[i % 4],
    assigneeId: `user-${(i % 5) + 1}`,
    assigneeName: ['Jean Bernard', 'Sophie Martin', 'Pierre Dubois', 'Marie Lefevre', 'Lucas Thomas'][i % 5],
    assigneeAvatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
    projectId: `project-${(i % 15) + 1}`,
    projectName: `Projet ${i % 15 + 1}`,
    dueDate: daysFromNow(i % 14),
    tags: [['frontend'], ['backend'], ['design'], ['devops'], ['urgent'], ['review']][i % 6],
    createdAt: daysAgo(i + 1),
  };
});

const DEPARTMENTS = ['Sales', 'Finance', 'HR', 'Engineering', 'Marketing', 'Operations', 'Legal', 'Support'];
const POSITIONS = ['Manager', 'Senior Specialist', 'Director', 'Analyst', 'Coordinator', 'Lead', 'Associate', 'VP'];

export const MOCK_EMPLOYEES: Employee[] = Array.from({ length: 25 }, (_, i) => {
  const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
  const lastName = LAST_NAMES[(i * 3) % LAST_NAMES.length];
  const dept = DEPARTMENTS[i % DEPARTMENTS.length];
  const statuses: Employee['status'][] = ['active', 'active', 'active', 'active', 'on_leave', 'terminated'];
  return {
    id: `emp-${i + 1}`,
    firstName,
    lastName,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@acme.com`,
    phone: `+33 6 ${String((i * 13) % 100).padStart(2, '0')} ${String((i * 7) % 100).padStart(2, '0')} ${String((i * 11) % 100).padStart(2, '0')} ${String((i * 17) % 100).padStart(2, '0')}`,
    position: `${POSITIONS[i % POSITIONS.length]} ${dept}`,
    department: dept,
    managerId: i < 5 ? undefined : `emp-${(i % 5) + 1}`,
    managerName: i < 5 ? undefined : `${FIRST_NAMES[(i % 5)]} ${LAST_NAMES[(i * 3) % LAST_NAMES.length]}`,
    startDate: daysAgo(i * 30 + 60),
    status: statuses[i % statuses.length],
    avatarColor: randomColor(i),
    salary: 35000 + i * 2500,
    location: ['Paris', 'Lyon', 'Bordeaux', 'Lille', 'Remote'][i % 5],
  };
});

export const MOCK_JOB_OPENINGS: JobOpening[] = Array.from({ length: 10 }, (_, i) => ({
  id: `job-${i + 1}`,
  title: [
    'Développeur Full-Stack Senior', 'Product Manager', 'Data Scientist', 'UX Designer',
    'Sales Executive', 'Comptable Senior', 'Responsable Marketing', 'DevOps Engineer',
    'Business Analyst', 'Customer Success Manager',
  ][i],
  department: DEPARTMENTS[i % DEPARTMENTS.length],
  status: (['open', 'open', 'open', 'paused', 'closed'] as JobOpening['status'][])[i % 5],
  applicants: (i % 15) + 3,
  postedDate: daysAgo(i * 5 + 2),
  location: ['Paris', 'Lyon', 'Remote', 'Bordeaux'][i % 4],
  type: (['full_time', 'full_time', 'contract', 'part_time', 'internship'] as JobOpening['type'][])[i % 5],
}));

export const MOCK_CANDIDATES: Candidate[] = Array.from({ length: 20 }, (_, i) => {
  const stages: Candidate['stage'][] = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'];
  return {
    id: `cand-${i + 1}`,
    name: `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[(i * 5) % LAST_NAMES.length]}`,
    email: `candidate${i + 1}@email.com`,
    jobId: `job-${(i % 10) + 1}`,
    jobTitle: ['Développeur Full-Stack Senior', 'Product Manager', 'Data Scientist', 'UX Designer'][i % 4],
    stage: stages[i % stages.length],
    score: 60 + (i % 40),
    avatarColor: randomColor(i + 10),
    appliedAt: daysAgo(i * 2 + 1),
  };
});
