import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Upload, Play, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ModelMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  capabilities: string[];
  uploadDate: string;
  filePath: string;
  isActive: boolean;
}

export default function ModelManager() {
  const [models, setModels] = useState<ModelMetadata[]>([]);
  const [activeModel, setActiveModel] = useState<ModelMetadata | null>(null);
  const [currentModelInfo, setCurrentModelInfo] = useState<{ name: string; type: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    name: '',
    description: '',
    capabilities: ['speech-to-text', 'translation', 'text-to-speech']
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchModels();
    fetchActiveModel();
  }, []);

  const fetchModels = async () => {
    try {
      const response = await fetch('/api/models', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setModels(data);
      }
    } catch (error) {
      console.error('Error fetching models:', error);
    }
  };

  const fetchActiveModel = async () => {
    try {
      const response = await fetch('/api/models/active', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setActiveModel(data.activeModel);
        setCurrentModelInfo(data.currentModelInfo);
      }
    } catch (error) {
      console.error('Error fetching active model:', error);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !uploadForm.name) {
      toast({
        title: "Upload Error",
        description: "Please select a file and provide a model name",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('model', selectedFile);
      formData.append('name', uploadForm.name);
      formData.append('description', uploadForm.description);
      formData.append('capabilities', JSON.stringify(uploadForm.capabilities));

      const response = await fetch('/api/models/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Model uploaded successfully",
        });
        setUploadForm({ name: '', description: '', capabilities: ['speech-to-text', 'translation', 'text-to-speech'] });
        setSelectedFile(null);
        fetchModels();
      } else {
        const error = await response.json();
        throw new Error(error.message);
      }
    } catch (error) {
      toast({
        title: "Upload Error",
        description: error instanceof Error ? error.message : "Failed to upload model",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleActivate = async (modelId: string) => {
    try {
      const response = await fetch(`/api/models/${modelId}/activate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Model activated successfully",
        });
        fetchActiveModel();
        fetchModels();
      } else {
        const error = await response.json();
        throw new Error(error.message);
      }
    } catch (error) {
      toast({
        title: "Activation Error",
        description: error instanceof Error ? error.message : "Failed to activate model",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (modelId: string) => {
    if (!confirm('Are you sure you want to delete this model?')) {
      return;
    }

    try {
      const response = await fetch(`/api/models/${modelId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Model deleted successfully",
        });
        fetchModels();
        if (activeModel?.id === modelId) {
          setActiveModel(null);
        }
      } else {
        const error = await response.json();
        throw new Error(error.message);
      }
    } catch (error) {
      toast({
        title: "Delete Error",
        description: error instanceof Error ? error.message : "Failed to delete model",
        variant: "destructive",
      });
    }
  };

  const handleResetToOpenAI = async () => {
    try {
      const response = await fetch('/api/models/reset-to-openai', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Reset to OpenAI model successfully",
        });
        fetchActiveModel();
        fetchModels();
      } else {
        const error = await response.json();
        throw new Error(error.message);
      }
    } catch (error) {
      toast({
        title: "Reset Error",
        description: error instanceof Error ? error.message : "Failed to reset to OpenAI",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">AI Model Manager</h1>
        <div className="flex items-center space-x-4">
          {currentModelInfo && (
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm text-gray-600">
                Current: {currentModelInfo.name} ({currentModelInfo.type})
              </span>
            </div>
          )}
          <Button
            size="sm"
            onClick={handleResetToOpenAI}
            variant="outline"
            className="text-xs"
          >
            Reset to OpenAI
          </Button>
        </div>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Custom AI Model</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="model-name">Model Name</Label>
              <Input
                id="model-name"
                value={uploadForm.name}
                onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
                placeholder="Enter model name"
              />
            </div>
            <div>
              <Label htmlFor="model-file">Model File</Label>
              <Input
                id="model-file"
                type="file"
                onChange={handleFileSelect}
                accept=".model,.onnx,.pb,.h5,.json,.bin"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="model-description">Description</Label>
            <Textarea
              id="model-description"
              value={uploadForm.description}
              onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
              placeholder="Describe your model's capabilities"
              rows={3}
            />
          </div>

          <Button 
            onClick={handleUpload} 
            disabled={isUploading || !selectedFile || !uploadForm.name}
            className="w-full"
          >
            <Upload className="w-4 h-4 mr-2" />
            {isUploading ? 'Uploading...' : 'Upload Model'}
          </Button>
        </CardContent>
      </Card>

      {/* Models List */}
      <Card>
        <CardHeader>
          <CardTitle>Uploaded Models</CardTitle>
        </CardHeader>
        <CardContent>
          {models.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Upload className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No models uploaded yet</p>
              <p className="text-sm">Upload your first AI model to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {models.map((model) => (
                <div key={model.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold">{model.name}</h3>
                        {model.isActive && (
                          <Badge variant="default" className="bg-green-500">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Active
                          </Badge>
                        )}
                        <Badge variant="outline">v{model.version}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{model.description}</p>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {model.capabilities.map((capability) => (
                          <Badge key={capability} variant="secondary" className="text-xs">
                            {capability}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500">
                        Uploaded: {new Date(model.uploadDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      {!model.isActive && (
                        <Button
                          size="sm"
                          onClick={() => handleActivate(model.id)}
                          variant="outline"
                        >
                          <Play className="w-4 h-4 mr-1" />
                          Activate
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={() => handleDelete(model.id)}
                        variant="destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
