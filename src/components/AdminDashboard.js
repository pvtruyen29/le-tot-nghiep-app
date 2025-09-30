// src/components/AdminDashboard.js
import { useState, useEffect } from 'react';
import { db, storage } from '../lib/firebase';
import { collection, addDoc, getDocs, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import EditEventModal from './EditEventModal';
import Barcode from './Barcode';

export default function AdminDashboard() {
    const [events, setEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    
    const [title, setTitle] = useState('');
    const [organizer, setOrganizer] = useState('');
    const [location, setLocation] = useState('');
    const [eventTime, setEventTime] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [notes, setNotes] = useState('');
    const [imageFile, setImageFile] = useState(null);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);

    const [selectedEventId, setSelectedEventId] = useState('');
    const [registrations, setRegistrations] = useState([]);
    const [eligibleStudents, setEligibleStudents] = useState([]);
    
    const [csvFile, setCsvFile] = useState(null);
    const [newStudent, setNewStudent] = useState({ mssv: '', hoTen: '' });

    const fetchEvents = async () => {
        setIsLoading(true);
        try {
            const querySnapshot = await getDocs(collection(db, "events"));
            const eventsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            eventsData.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
            setEvents(eventsData);
            if (eventsData.length > 0 && !selectedEventId) {
                setSelectedEventId(eventsData[0].id);
            } else if (eventsData.length === 0) {
                setSelectedEventId('');
            }
        } catch (error) {
            setMessage("Lỗi: Không thể tải danh sách sự kiện.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, []);
    
    useEffect(() => {
        if (!selectedEventId) {
            setRegistrations([]);
            setEligibleStudents([]);
            return;
        }
        const fetchAllData = async () => {
            setIsLoading(true);
            try {
                const regRes = await fetch(`/api/registrations?eventId=${selectedEventId}`);
                const regData = await regRes.json();
                setRegistrations(regData);
                const eligibleRes = await fetch(`/api/events/${selectedEventId}/students`);
                const eligibleData = await eligibleRes.json();
                setEligibleStudents(eligibleData);
            } catch (error) {
                console.error("Lỗi tải dữ liệu:", error);
                setMessage("Lỗi: Không thể tải dữ liệu của sự kiện.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchAllData();
    }, [selectedEventId]);

    const handleAddEvent = async (e) => {
        e.preventDefault();
        if (!title || !imageFile) return alert('Vui lòng điền tên sự kiện và chọn ảnh.');
        setIsLoading(true);
        setMessage('');
        try {
            const imageRef = ref(storage, `event_images/${imageFile.name}_${Date.now()}`);
            const snapshot = await uploadBytes(imageRef, imageFile);
            const imageUrl = await getDownloadURL(snapshot.ref);
            await addDoc(collection(db, 'events'), {
                title, organizer, location, notes, imageUrl,
                eventTime: eventTime ? Timestamp.fromDate(new Date(eventTime)) : null,
                startTime: startTime ? Timestamp.fromDate(new Date(startTime)) : null,
                endTime: endTime ? Timestamp.fromDate(new Date(endTime)) : null,
                createdAt: Timestamp.now(),
                eligibleCount: 0,
                registeredCount: 0,
            });
            setMessage('Thêm sự kiện thành công!');
            e.target.reset();
            fetchEvents();
        } catch (error) {
            setMessage('Lỗi: Không thể thêm sự kiện.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteEvent = async (eventId, eventTitle) => {
        if (window.confirm(`Bạn có chắc chắn muốn xóa sự kiện "${eventTitle}" không?`)) {
            setIsLoading(true);
            setMessage('');
            try {
                const res = await fetch(`/api/events/${eventId}`, { method: 'DELETE' });
                const data = await res.json();
                if (!res.ok) throw new Error(data.message);
                setMessage('Xóa sự kiện thành công!');
                setEvents(prevEvents => prevEvents.filter(event => event.id !== eventId));
                if (selectedEventId === eventId) {
                    const remainingEvents = events.filter(event => event.id !== eventId);
                    setSelectedEventId(remainingEvents.length > 0 ? remainingEvents[0].id : '');
                }
            } catch (error) {
                setMessage(`Lỗi: ${error.message}`);
            } finally {
                setIsLoading(false);
            }
        }
    };
    
    const handleOpenEditModal = (event) => {
        setEditingEvent(event);
        setIsEditModalOpen(true);
    };

    const handleSaveChanges = async (eventId, updatedData) => {
        setIsLoading(true);
        setMessage('');
        try {
            const res = await fetch(`/api/events/${eventId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            setMessage('Cập nhật sự kiện thành công!');
            setIsEditModalOpen(false);
            setEditingEvent(null);
            fetchEvents();
        } catch (error) {
            setMessage(`Lỗi: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUploadStudents = async (e) => {
        e.preventDefault();
        if (!selectedEventId || !csvFile) return alert('Vui lòng chọn sự kiện và file CSV.');
        setIsLoading(true);
        setMessage('');
        const formData = new FormData();
        formData.append('eventId', selectedEventId);
        formData.append('csvFile', csvFile);
        try {
            const response = await fetch('/api/upload-students', { method: 'POST', body: formData });
            const data = await response.json();
            setMessage(data.message);
            if (!response.ok) throw new Error(data.message);
            const res = await fetch(`/api/events/${selectedEventId}/students`);
            setEligibleStudents(await res.json());
        } catch (error) {
            setMessage(`Lỗi: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddStudent = async (e) => {
        e.preventDefault();
        if (!newStudent.mssv || !newStudent.hoTen) return alert('Vui lòng nhập MSSV và Họ Tên.');
        setIsLoading(true);
        try {
            const res = await fetch(`/api/events/${selectedEventId}/students`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newStudent)
            });
            const data = await res.json();
            setMessage(data.message);
            if (!res.ok) throw new Error(data.message);
            setEligibleStudents(prev => [...prev, {mssv: newStudent.mssv.trim(), ...newStudent}]);
            setNewStudent({ mssv: '', hoTen: '' });
        } catch (error) {
            setMessage(`Lỗi: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteStudent = async (studentId) => {
        if (window.confirm(`Bạn có chắc muốn xóa sinh viên ${studentId} khỏi danh sách đủ điều kiện?`)) {
            setIsLoading(true);
            try {
                const res = await fetch(`/api/events/${selectedEventId}/students/${studentId}`, { method: 'DELETE' });
                const data = await res.json();
                setMessage(data.message);
                if (!res.ok) throw new Error(data.message);
                setEligibleStudents(prev => prev.filter(s => s.mssv !== studentId));
            } catch (error) {
                setMessage(`Lỗi: ${error.message}`);
            } finally {
                setIsLoading(false);
            }
        }
    };
    
    const handleDownloadExcel = async () => {
        if (registrations.length === 0) return alert("Không có dữ liệu để tải.");
        setIsLoading(true);
        setMessage('Đang tạo file Excel, vui lòng chờ...');
        try {
            const res = await fetch(`/api/export-excel?eventId=${selectedEventId}`);

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Không thể tạo file Excel từ server.');
            }

            const blob = await res.blob();
            
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `danh_sach_dang_ky_${selectedEventId}.xlsx`;
            document.body.appendChild(a);
a.click();
            window.URL.revokeObjectURL(url);
            setMessage('Tạo file Excel thành công!');

        } catch (error) {
            console.error(error);
            setMessage(`Lỗi: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownloadPhotos = () => {
        if (registrations.length === 0) return alert("Không có ảnh để tải.");
        window.open(`/api/registrations?eventId=${selectedEventId}&action=download_zip`, '_blank');
    };

    return (
        <div style={{ maxWidth: '1200px', margin: 'auto', padding: '2rem' }}>
            <h1>Bảng điều khiển Admin</h1>
            {message && <p style={{ fontWeight: 'bold', background: '#e0f7fa', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>{message}</p>}

            <details style={{ border: '1px solid #ccc', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 'bold', fontSize: '1.2rem' }}>Thêm sự kiện mới</summary>
                <form onSubmit={handleAddEvent} style={{ marginTop: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                        <input type="text" placeholder="Tên sự kiện (*)" onChange={(e) => setTitle(e.target.value)} required />
                        <input type="text" placeholder="Đơn vị tổ chức" onChange={(e) => setOrganizer(e.target.value)} />
                        <input type="text" placeholder="Nơi tổ chức" onChange={(e) => setLocation(e.target.value)} />
                        <div><label>Thời gian tổ chức:</label><input type="datetime-local" onChange={(e) => setEventTime(e.target.value)} /></div>
                        <div><label>Bắt đầu đăng ký:</label><input type="datetime-local" onChange={(e) => setStartTime(e.target.value)} /></div>
                        <div><label>Hạn chót đăng ký:</label><input type="datetime-local" onChange={(e) => setEndTime(e.target.value)} /></div>
                    </div>
                    <textarea placeholder="Ghi chú, lưu ý..." onChange={(e) => setNotes(e.target.value)} style={{ width: 'calc(100% - 16px)', marginTop: '1rem', minHeight: '80px', padding: '8px' }}></textarea>
                    <div style={{ marginTop: '1rem' }}>
                        <label>Ảnh minh họa (*): </label>
                        <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} required />
                        <button type="submit" disabled={isLoading} style={{ float: 'right', padding: '10px 20px' }}>{isLoading ? 'Đang xử lý...' : 'Thêm sự kiện'}</button>
                    </div>
                </form>
            </details>

            <div style={{ border: '1px solid #0070f3', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
                <h2>Quản lý Sự kiện & Dữ liệu Sinh viên</h2>
                <div style={{ marginBottom: '1rem' }}>
                    <label><strong>Chọn sự kiện để quản lý:</strong></label><br/>
                    <select value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '0.5rem' }}>
                      <option value="">-- Vui lòng chọn sự kiện --</option>
                      {events.map(event => (<option key={event.id} value={event.id}>{event.title}</option>))}
                    </select>
                </div>
                <button onClick={() => handleOpenEditModal(events.find(e => e.id === selectedEventId))} disabled={!selectedEventId}>Sửa sự kiện</button>
                <button onClick={() => handleDeleteEvent(selectedEventId, events.find(e => e.id === selectedEventId)?.title)} disabled={isLoading || !selectedEventId} style={{ background: '#ff4d4f', color: 'white', border: 'none', padding: '10px', marginLeft: '1rem' }}>Xóa sự kiện</button>
                <form onSubmit={handleUploadStudents} style={{ marginTop: '1rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                    <label>Tải lên DS sinh viên đủ điều kiện (CSV UTF-8):</label><br/>
                    <input type="file" accept=".csv" onChange={(e) => setCsvFile(e.target.files[0])} required style={{marginTop: '0.5rem'}} />
                    <button type="submit" disabled={isLoading || !selectedEventId} style={{ marginLeft: '1rem' }}>Tải lên</button>
                </form>
            </div>
            
            <details open style={{ border: '1px solid #28a745', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 'bold', fontSize: '1.2rem' }}>Danh sách Sinh viên Đủ điều kiện ({eligibleStudents.length})</summary>
                <form onSubmit={handleAddStudent} style={{ marginTop: '1rem' }}>
                    <input type="text" placeholder="MSSV" value={newStudent.mssv} onChange={e => setNewStudent({...newStudent, mssv: e.target.value.toUpperCase()})} />
                    <input type="text" placeholder="Họ và Tên" value={newStudent.hoTen} onChange={e => setNewStudent({...newStudent, hoTen: e.target.value})} style={{marginLeft: '1rem'}} />
                    <button type="submit" style={{marginLeft: '1rem'}}>Thêm sinh viên</button>
                </form>
                <div style={{ maxHeight: '400px', overflowY: 'auto', marginTop: '1rem' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead><tr><th>MSSV</th><th>Họ Tên</th><th>Hành động</th></tr></thead>
                        <tbody>
                            {eligibleStudents.map(student => (
                                <tr key={student.mssv}>
                                    <td>{student.mssv}</td><td>{student.hoTen}</td>
                                    <td><button onClick={() => handleDeleteStudent(student.mssv)} style={{background: '#dc3545', color: 'white'}}>Xóa</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </details>

            <div>
                <h2>Danh sách Sinh viên đã Đăng ký ({registrations.length})</h2>
                <div style={{ marginBottom: '1rem' }}>
                    <button onClick={handleDownloadExcel} disabled={registrations.length === 0 || isLoading}>
                        {isLoading ? 'Đang tạo file...' : 'Tải về danh sách (Excel & Barcode)'}
                    </button>
                    <button onClick={handleDownloadPhotos} disabled={registrations.length === 0} style={{ marginLeft: '1rem' }}>
                        Tải về tất cả ảnh (ZIP)
                    </button>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9em' }}>
                        <thead>
                            <tr style={{ background: '#f0f0f0' }}>
                                <th style={{ padding: '8px', border: '1px solid #ddd' }}>MSSV</th>
                                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Họ Tên</th>
                                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Lớp</th>
                                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Ngành</th>
                                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Xếp Loại</th>
                                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Ảnh</th>
                                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Barcode</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading && registrations.length === 0 ? (
                                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '1rem' }}>Đang tải...</td></tr>
                            ) : registrations.length > 0 ? (
                                registrations.map(reg => (
                                    <tr key={reg.mssv}>
                                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{reg.mssv}</td>
                                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{reg.hoTen}</td>
                                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{reg.lop}</td>
                                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{reg.nganh}</td>
                                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{reg.xepLoai}</td>
                                        <td style={{ padding: '8px', border: '1px solid #ddd' }}><a href={reg.photoURL} target="_blank" rel="noopener noreferrer">Xem ảnh</a></td>
                                        <td style={{ padding: '8px', border: '1px solid #ddd', minWidth: '200px' }}>
                                            <Barcode value={reg.mssv} width={2} height={50} />
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '1rem' }}>Chưa có sinh viên nào đăng ký cho sự kiện này.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isEditModalOpen && (
                <EditEventModal 
                    event={editingEvent}
                    onClose={() => setIsEditModalOpen(false)}
                    onSave={handleSaveChanges}
                />
            )}
        </div>
    );
}
