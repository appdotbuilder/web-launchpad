
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback } from 'react';
import { Plus, LogOut, Edit, Trash2 } from 'lucide-react';
import type { AuthResponse, Link, CreateLinkInput, UpdateLinkInput } from '../../server/src/schema';

function App() {
  const [user, setUser] = useState<AuthResponse['user'] | null>(null);
  const [links, setLinks] = useState<Link[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');

  // Auth form state
  const [authData, setAuthData] = useState({
    email: '',
    password: '',
    display_name: ''
  });

  // Link form state
  const [linkFormData, setLinkFormData] = useState<CreateLinkInput>({
    user_id: 0,
    title: '',
    url: '',
    custom_icon_url: null
  });

  // Edit link state
  const [editingLink, setEditingLink] = useState<Link | null>(null);
  const [editFormData, setEditFormData] = useState<UpdateLinkInput>({
    id: 0,
    user_id: 0,
    title: '',
    url: '',
    custom_icon_url: null
  });

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  // Load user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const savedToken = localStorage.getItem('token');
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // Load links when user is authenticated
  const loadLinks = useCallback(async () => {
    if (!user) return;
    try {
      const result = await trpc.getUserLinks.query({ user_id: user.id });
      setLinks(result);
    } catch (error) {
      console.error('Failed to load links:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadLinks();
    }
  }, [user, loadLinks]);

  const handleAuth = async (e: React.FormEvent, type: 'login' | 'register') => {
    e.preventDefault();
    setIsLoading(true);
    try {
      let response: AuthResponse;
      if (type === 'register') {
        response = await trpc.registerUser.mutate({
          email: authData.email,
          password: authData.password,
          display_name: authData.display_name
        });
      } else {
        response = await trpc.loginUser.mutate({
          email: authData.email,
          password: authData.password
        });
      }

      setUser(response.user);
      localStorage.setItem('user', JSON.stringify(response.user));
      localStorage.setItem('token', response.token);
      
      // Reset form
      setAuthData({ email: '', password: '', display_name: '' });
    } catch (error) {
      console.error(`${type} failed:`, error);
      alert(`${type} failed. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setLinks([]);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsLoading(true);
    try {
      const response = await trpc.createLink.mutate({
        ...linkFormData,
        user_id: user.id
      });
      
      setLinks((prev: Link[]) => [...prev, response]);
      setLinkFormData({
        user_id: user.id,
        title: '',
        url: '',
        custom_icon_url: null
      });
      setShowAddDialog(false);
    } catch (error) {
      console.error('Failed to create link:', error);
      alert('Failed to create link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditLink = (link: Link) => {
    setEditingLink(link);
    setEditFormData({
      id: link.id,
      user_id: link.user_id,
      title: link.title,
      url: link.url,
      custom_icon_url: link.custom_icon_url
    });
    setShowEditDialog(true);
  };

  const handleUpdateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLink) return;
    
    setIsLoading(true);
    try {
      const response = await trpc.updateLink.mutate(editFormData);
      
      setLinks((prev: Link[]) => 
        prev.map((link: Link) => link.id === response.id ? response : link)
      );
      setShowEditDialog(false);
      setEditingLink(null);
    } catch (error) {
      console.error('Failed to update link:', error);
      alert('Failed to update link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLink = async (link: Link) => {
    setIsLoading(true);
    try {
      await trpc.deleteLink.mutate({
        id: link.id,
        user_id: link.user_id
      });
      
      setLinks((prev: Link[]) => prev.filter((l: Link) => l.id !== link.id));
    } catch (error) {
      console.error('Failed to delete link:', error);
      alert('Failed to delete link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getFaviconUrl = (link: Link): string => {
    if (link.custom_icon_url) {
      return link.custom_icon_url;
    }
    if (link.favicon_url) {
      return link.favicon_url;
    }
    // Fallback to Google's favicon service
    try {
      const domain = new URL(link.url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    } catch {
      return '/favicon.ico'; // Ultimate fallback
    }
  };

  // Authentication UI
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              🚀 LaunchPad
            </CardTitle>
            <p className="text-gray-600">Your personalized web launcher</p>
          </CardHeader>
          <CardContent>
            <Tabs value={authTab} onValueChange={(value) => setAuthTab(value as 'login' | 'register')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={(e) => handleAuth(e, 'login')} className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={authData.email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setAuthData((prev) => ({ ...prev, email: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={authData.password}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setAuthData((prev) => ({ ...prev, password: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Logging in...' : 'Login'}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="register">
                <form onSubmit={(e) => handleAuth(e, 'register')} className="space-y-4">
                  <div>
                    <Label htmlFor="display_name">Display Name</Label>
                    <Input
                      id="display_name"
                      value={authData.display_name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setAuthData((prev) => ({ ...prev, display_name: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="reg_email">Email</Label>
                    <Input
                      id="reg_email"
                      type="email"
                      value={authData.email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setAuthData((prev) => ({ ...prev, email: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="reg_password">Password</Label>
                    <Input
                      id="reg_password"
                      type="password"
                      value={authData.password}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setAuthData((prev) => ({ ...prev, password: e.target.value }))
                      }
                      minLength={6}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Creating Account...' : 'Register'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main app UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3 sm:py-4">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                🚀 LaunchPad
              </h1>
              <Badge variant="outline" className="hidden md:inline-flex text-xs">
                Welcome, {user.display_name}!
              </Badge>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3">
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 h-9 px-3 sm:px-4">
                    <Plus className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Add Link</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Link</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddLink} className="space-y-4">
                    <div>
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={linkFormData.title}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setLinkFormData((prev: CreateLinkInput) => ({ ...prev, title: e.target.value }))
                        }
                        placeholder="e.g., GitHub"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="url">URL</Label>
                      <Input
                        id="url"
                        type="url"
                        value={linkFormData.url}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setLinkFormData((prev: CreateLinkInput) => ({ ...prev, url: e.target.value }))
                        }
                        placeholder="https://github.com"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="custom_icon">Custom Icon URL (optional)</Label>
                      <Input
                        id="custom_icon"
                        type="url"
                        value={linkFormData.custom_icon_url || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setLinkFormData((prev: CreateLinkInput) => ({
                            ...prev,
                            custom_icon_url: e.target.value || null
                          }))
                        }
                        placeholder="https://example.com/icon.png"
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowAddDialog(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isLoading}>
                        {isLoading ? 'Adding...' : 'Add Link'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
              
              <Button variant="outline" size="sm" onClick={handleLogout} className="h-9 px-3 sm:px-4">
                <LogOut className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
        {links.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📱</div>
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">
              Your LaunchPad is Empty
            </h2>
            <p className="text-gray-500 mb-6">
              Add your first link to get started with your personalized web launcher!
            </p>
            <Button
              onClick={() => setShowAddDialog(true)}
              className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Link
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-4 sm:gap-5 md:gap-6">
            {links.map((link: Link) => (
              <div
                key={link.id}
                className="group relative bg-white/70 backdrop-blur-sm rounded-3xl p-5 sm:p-6 hover:bg-white/90 cursor-pointer border border-gray-200/50 link-grid-item"
                tabIndex={0}
                role="button"
                aria-label={`Open ${link.title}`}
              >
                {/* Link Click Area */}
                <div
                  onClick={() => window.open(link.url, '_blank')}
                  className="flex flex-col items-center w-full h-full justify-center touch-manipulation"
                >
                  <div className="link-icon-container w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center overflow-hidden shadow-sm border border-gray-200/50">
                    <img
                      src={getFaviconUrl(link)}
                      alt={link.title}
                      className="link-icon w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 object-contain"
                      onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/favicon.ico';
                      }}
                    />
                  </div>
                  <span className="link-title text-sm sm:text-base font-medium text-gray-800 text-center leading-snug px-2 max-w-full mt-3 sm:mt-4">
                    {link.title}
                  </span>
                </div>

                {/* Edit/Delete Controls - Desktop Only */}
                <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-1 hidden sm:flex">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 w-8 p-0 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg border-2 border-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditLink(link);
                    }}
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 w-8 p-0 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg border-2 border-white"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Link</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{link.title}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteLink(link)}
                          className="bg-red-500 hover:bg-red-600"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                {/* Mobile Context Menu - Long Press Alternative */}
                <div className="sm:hidden absolute inset-0 rounded-3xl"
                     onContextMenu={(e) => {
                       e.preventDefault();
                       handleEditLink(link);
                     }}
                     onTouchStart={(e) => {
                       // Add visual feedback for touch
                       const target = e.currentTarget.parentElement;
                       if (target) {
                         target.style.transform = 'scale(0.95)';
                       }
                     }}
                     onTouchEnd={(e) => {
                       // Remove visual feedback
                       const target = e.currentTarget.parentElement;
                       if (target) {
                         target.style.transform = '';
                       }
                     }}
                />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Edit Link Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Link</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateLink} className="space-y-4">
            <div>
              <Label htmlFor="edit_title">Title</Label>
              <Input
                id="edit_title"
                value={editFormData.title || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditFormData((prev: UpdateLinkInput) => ({ ...prev, title: e.target.value }))
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="edit_url">URL</Label>
              <Input
                id="edit_url"
                type="url"
                value={editFormData.url || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditFormData((prev: UpdateLinkInput) => ({ ...prev, url: e.target.value }))
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="edit_custom_icon">Custom Icon URL (optional)</Label>
              <Input
                id="edit_custom_icon"
                type="url"
                value={editFormData.custom_icon_url || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditFormData((prev: UpdateLinkInput) => ({
                    ...prev,
                    custom_icon_url: e.target.value || null
                  }))
                }
                placeholder="https://example.com/icon.png"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Updating...' : 'Update Link'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default App;
