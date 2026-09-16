export default function CourseCard({ course }) {
  if (!course) {
    return (
      <div className="card">
        <h3>Course</h3>
        <p style={{ color: 'var(--text-muted)' }}>No course assigned yet.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3>Course</h3>
      <p style={{ fontWeight: 600, margin: '0 0 4px' }}>{course.name}</p>
      {course.category && <p style={{ color: 'var(--text-muted)', margin: '0 0 8px' }}>{course.category}</p>}
      {course.description && <p style={{ margin: 0 }}>{course.description}</p>}
    </div>
  );
}
