import React, { useState } from 'react';
import { Upload, X, FileText, Image, Video } from 'lucide-react';

/**
 * Report Form - Input form for anonymous reporting
 */
const ReportForm = ({ onSubmit, disabled = false }) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: 'security_vulnerability',
        contactEmail: '',
        contactPhone: '',
        provideContact: false
    });
    const [attachments, setAttachments] = useState([]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (formData.title && formData.description) {
            onSubmit({ ...formData, attachments });
        }
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        const validFiles = files.filter(file => {
            const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/mpeg', 'video/quicktime'];
            const maxSize = 10 * 1024 * 1024; // 10MB
            return validTypes.includes(file.type) && file.size <= maxSize;
        });

        setAttachments(prev => [...prev, ...validFiles].slice(0, 5)); // Max 5 files
    };

    const removeAttachment = (index) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const getFileIcon = (fileType) => {
        if (fileType.startsWith('image/')) return <Image className="w-4 h-4" />;
        if (fileType.startsWith('video/')) return <Video className="w-4 h-4" />;
        return <FileText className="w-4 h-4" />;
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-gray-500 mb-2">Report Category</label>
                <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="input-field text-gray-900"
                    disabled={disabled}
                >
                    <option value="security_vulnerability">Security Vulnerability</option>
                    <option value="harassment">Harassment / Bullying</option>
                    <option value="theft">Theft / Fraud</option>
                    <option value="violence">Violence / Assault</option>
                    <option value="discrimination">Discrimination</option>
                    <option value="misconduct">Misconduct / Corruption</option>
                    <option value="data_breach">Data Breach Alert</option>
                    <option value="cybercrime">Cybercrime</option>
                    <option value="substance_abuse">Substance Abuse</option>
                    <option value="other">Other / General Intel</option>
                </select>
            </div>

            <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-gray-500 mb-2">Subject</label>
                <input
                    type="text"
                    placeholder="Brief title of the report"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="input-field text-gray-900"
                    required
                    disabled={disabled}
                />
            </div>

            <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-gray-500 mb-2">Details</label>
                <textarea
                    placeholder="Provide as much detail as possible. Your anonymity is guaranteed by post-quantum encryption."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input-field h-32 resize-none text-gray-900"
                    required
                    disabled={disabled}
                />
            </div>

            {/* Proof/Attachments Section */}
            <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-gray-500 mb-2">
                    Proof / Evidence (Optional)
                </label>
                <div className="space-y-3">
                    <div className="relative">
                        <input
                            type="file"
                            id="attachments"
                            multiple
                            accept=".pdf,.jpg,.jpeg,.png,.gif,.mp4,.mpeg,.mov"
                            onChange={handleFileChange}
                            className="hidden"
                            disabled={disabled || attachments.length >= 5}
                        />
                        <label
                            htmlFor="attachments"
                            className={`flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-xl transition-all cursor-pointer ${
                                disabled || attachments.length >= 5
                                    ? 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'border-gray-400 bg-white/50 text-gray-700 hover:border-quantum-500 hover:bg-quantum-50'
                            }`}
                        >
                            <Upload className="w-5 h-5" />
                            <span className="text-sm font-medium">
                                {attachments.length >= 5 ? 'Maximum 5 files' : 'Upload PDF, Photos, or Videos'}
                            </span>
                        </label>
                        <p className="text-xs text-gray-500 mt-1 text-center">
                            Max 10MB per file • PDF, JPG, PNG, GIF, MP4
                        </p>
                    </div>

                    {/* Attachment List */}
                    {attachments.length > 0 && (
                        <div className="space-y-2">
                            {attachments.map((file, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between p-3 bg-white/80 backdrop-blur-sm rounded-lg border border-gray-300"
                                >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="text-quantum-600">
                                            {getFileIcon(file.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                {file.name}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {(file.size / 1024).toFixed(2)} KB
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeAttachment(index)}
                                        className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                                        disabled={disabled}
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Optional Contact Details */}
            <div className="border-t border-gray-300 pt-4">
                <div className="flex items-center gap-2 mb-3">
                    <input
                        type="checkbox"
                        id="provideContact"
                        checked={formData.provideContact}
                        onChange={(e) => setFormData({ ...formData, provideContact: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-quantum-600 focus:ring-quantum-500"
                        disabled={disabled}
                    />
                    <label htmlFor="provideContact" className="text-sm font-medium text-gray-700">
                        Provide contact details (Optional - Reduces anonymity)
                    </label>
                </div>

                {formData.provideContact && (
                    <div className="space-y-3 animate-in slide-in-from-top duration-300">
                        <div>
                            <label className="block text-xs font-mono uppercase tracking-widest text-gray-500 mb-2">
                                Email Address
                            </label>
                            <input
                                type="email"
                                placeholder="your.email@example.com"
                                value={formData.contactEmail}
                                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                                className="input-field text-gray-900"
                                disabled={disabled}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-mono uppercase tracking-widest text-gray-500 mb-2">
                                Phone Number
                            </label>
                            <input
                                type="tel"
                                placeholder="+1 (555) 123-4567"
                                value={formData.contactPhone}
                                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                                className="input-field text-gray-900"
                                disabled={disabled}
                            />
                        </div>
                        <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                            ⚠️ Providing contact details may reduce your anonymity. Only share if you're comfortable being contacted.
                        </p>
                    </div>
                )}
            </div>

            <button
                type="submit"
                disabled={disabled || !formData.title || !formData.description}
                className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest transition-all ${disabled
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'btn-primary'
                    }`}
            >
                {disabled ? 'Processing Quantum Channel...' : 'Submit Anonymous Report'}
            </button>

            <p className="text-xs text-center text-gray-500 italic">
                "Your report is encrypted client-side using a hybrid BB84/Kyber-768 key. No identifying metadata is stored."
            </p>
        </form>
    );
};

export default ReportForm;
